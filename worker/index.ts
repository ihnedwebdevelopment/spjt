/**
 * Malířství Špejtek – Cloudflare Worker
 * Obsluhuje /api/* (obsah, poptávky, administrace, Google), /media/* (fotky z R2),
 * /sitemap.xml a /aktuality* (SEO meta pro články). Vše ostatní jsou statické soubory webu.
 */
import {
  type Env, HttpError, clientIp, createSession, destroySession, getSetting, hashPassword, isAdmin, json, now,
  randomToken, readJson, requireAdmin, safeEqual, sendMail, setSetting, sha256, str,
} from './lib'
import * as G from './google'

const COLLECTIONS = ['realizace', 'services', 'faqs'] as const
type Collection = (typeof COLLECTIONS)[number]
const isCollection = (c: string): c is Collection => (COLLECTIONS as readonly string[]).includes(c)

/** Statické stránky webu pro sitemapu (služby se doplní z databáze). */
const STATIC_PAGES: [string, number][] = [['/', 1], ['/vizualizator', 0.9], ['/kontakt', 0.9], ['/recenze', 0.6]]
const DEFAULT_SERVICE_SLUGS = [
  'malirske-prace-jihlava', 'malovani-bytu-jihlava', 'dekorativni-sterky-jihlava',
  'fasady-jihlava', 'nateracske-prace-jihlava', 'opravy-zdi-jihlava',
]

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, env, ctx, url)
      if (url.pathname.startsWith('/media/')) return await media(req, env, url)
      if (url.pathname === '/sitemap.xml') return await sitemap(env, url)
      if (url.pathname === '/aktuality' || url.pathname.startsWith('/aktuality/')) return await postHtml(req, env, url)
      return env.ASSETS.fetch(req)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, { status: e.status })
      console.error(e)
      return json({ error: 'Na serveru se něco pokazilo. Zkuste to prosím znovu.' }, { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>

/* ════════════════ API ════════════════ */
async function api(req: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const p = url.pathname
  const m = req.method

  // ── veřejné ──
  if (p === '/api/content' && m === 'GET') return publicContent(env)
  if (p.startsWith('/api/posts/') && m === 'GET') return publicPost(env, decodeURIComponent(p.slice(11)))
  if (p === '/api/inquiry' && m === 'POST') return createInquiry(req, env, ctx)
  if (p === '/api/review' && m === 'POST') return createReview(req, env, ctx)
  if (p === '/api/google/callback' && m === 'GET') {
    if (!(await isAdmin(env, req))) return Response.redirect(url.origin + '/admin', 302)
    return G.finishOAuth(env, req)
  }

  // ── přihlášení ──
  if (p === '/api/admin/me' && m === 'GET') {
    const admin = await env.DB.prepare('SELECT email FROM admin WHERE id = 1').first<{ email: string }>()
    if (!admin) return json({ setup: true, setupCodeConfigured: !!env.ADMIN_SETUP_CODE })
    return json({ setup: false, user: (await isAdmin(env, req)) ? { email: admin.email } : null })
  }
  if (p === '/api/admin/setup' && m === 'POST') return setup(req, env)
  if (p === '/api/admin/login' && m === 'POST') return login(req, env)
  if (p === '/api/admin/logout' && m === 'POST') {
    return json({ ok: true }, { headers: { 'set-cookie': await destroySession(env, req) } })
  }

  // ── vše níže jen pro přihlášeného majitele ──
  if (!p.startsWith('/api/admin/')) throw new HttpError(404, 'Neznámá adresa.')
  await requireAdmin(env, req)
  const seg = p.slice('/api/admin/'.length).split('/').map(decodeURIComponent)

  switch (seg[0]) {
    case 'password': return changePassword(req, env)
    case 'logout-all': {
      await env.DB.prepare('DELETE FROM sessions').run()
      return json({ ok: true }, { headers: { 'set-cookie': await destroySession(env, req) } })
    }
    case 'stats': return stats(env)
    case 'seed': return seed(req, env)
    case 'items': return items(req, env, seg)
    case 'posts': return posts(req, env, seg)
    case 'inquiries': return inquiries(req, env, seg)
    case 'inquiry-photo': return inquiryPhoto(env, url)
    case 'reviews': return reviews(req, env, seg)
    case 'settings': return settings(req, env)
    case 'media': return adminMedia(req, env, url)
    case 'google': {
      if (seg[1] === 'status') return json(await G.googleStatus(env))
      if (seg[1] === 'connect') return G.startOAuth(env, req)
      if (seg[1] === 'disconnect' && m === 'POST') { await G.disconnect(env); return json({ ok: true }) }
      if (seg[1] === 'config' && m === 'PUT') {
        const b = await readJson<G.GoogleConfig>(req)
        const cfg: G.GoogleConfig = { gscSite: str(b.gscSite, 300), adsCustomerId: str(b.adsCustomerId, 20), adsLoginCustomerId: str(b.adsLoginCustomerId, 20) }
        await setSetting(env, 'googleConfig', cfg)
        return json(await G.googleStatus(env))
      }
      break
    }
    case 'gsc': {
      if (seg[1] === 'sites') return json(await G.gscSites(env))
      if (seg[1] === 'report') return json(await G.gscReport(env, url))
      if (seg[1] === 'sitemaps' && m === 'GET') return json(await G.gscSitemaps(env))
      if (seg[1] === 'sitemaps' && m === 'POST') {
        const b = await readJson<{ url?: string }>(req)
        await G.gscSubmitSitemap(env, str(b.url, 500) || new URL('/sitemap.xml', env.SITE_URL).toString())
        return json({ ok: true })
      }
      if (seg[1] === 'inspect' && m === 'POST') {
        const b = await readJson<{ url?: string }>(req)
        return json(await G.gscInspect(env, str(b.url, 500)))
      }
      break
    }
    case 'ads': {
      if (seg[1] === 'accounts') return json(await G.adsAccounts(env))
      if (seg[1] === 'report') return json(await G.adsReport(env, url))
      if (seg[1] === 'campaigns' && seg[2] && m === 'POST') {
        const b = await readJson<{ status?: string }>(req)
        if (b.status !== 'ENABLED' && b.status !== 'PAUSED') throw new HttpError(400, 'Neplatný stav kampaně.')
        await G.adsSetCampaignStatus(env, seg[2], b.status)
        return json({ ok: true })
      }
      if (seg[1] === 'budget' && m === 'POST') {
        const b = await readJson<{ resource?: string; amount?: number }>(req)
        await G.adsSetBudget(env, str(b.resource, 200), Number(b.amount))
        return json({ ok: true })
      }
      break
    }
  }
  throw new HttpError(404, 'Neznámá adresa.')
}

/* ════════════════ veřejný obsah ════════════════ */
interface Business { name?: string; tagline?: string; phoneDisplay?: string; phoneTel?: string; area?: string; email?: string }

async function publicContent(env: Env) {
  const [rows, posts, business, pageSeo, revs] = await Promise.all([
    env.DB.prepare('SELECT collection, id, data FROM items WHERE published = 1 ORDER BY collection, sort, id').all<{ collection: string; id: string; data: string }>(),
    env.DB.prepare('SELECT slug, title, excerpt, cover, published_at FROM posts WHERE published = 1 AND published_at <= ? ORDER BY published_at DESC LIMIT 50').bind(now()).all(),
    getSetting<Business>(env, 'business'),
    getSetting<Record<string, { title?: string; description?: string }>>(env, 'pageSeo'),
    env.DB.prepare("SELECT * FROM reviews WHERE status = 'approved' ORDER BY COALESCE(approved_at, created_at) DESC LIMIT 100").all<Record<string, any>>()
      .catch(() => ({ results: [] as Record<string, any>[] })), // tabulka ještě není (před migrací)
  ])
  const out: Record<string, unknown[]> = { realizace: [], services: [], faqs: [] }
  for (const r of rows.results) out[r.collection]?.push({ ...JSON.parse(r.data), id: r.id })
  return json(
    { ...out, posts: posts.results.map(postSummary), business: business ?? {}, pageSeo: pageSeo ?? {}, reviews: revs.results.map(reviewPublic) },
    { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' } },
  )
}

const postSummary = (r: Record<string, unknown>) => ({
  slug: r.slug, title: r.title, excerpt: r.excerpt, cover: r.cover ?? null, publishedAt: r.published_at,
})

async function getPublishedPost(env: Env, slug: string) {
  return env.DB.prepare('SELECT * FROM posts WHERE slug = ? AND published = 1 AND published_at <= ?').bind(slug, now()).first<Record<string, any>>()
}

async function publicPost(env: Env, slug: string) {
  const r = await getPublishedPost(env, slug)
  if (!r) throw new HttpError(404, 'Článek nenalezen.')
  return json({
    ...postSummary(r), body: r.body, seoTitle: r.seo_title, seoDescription: r.seo_description, updatedAt: r.updated_at,
  }, { headers: { 'cache-control': 'public, max-age=30' } })
}

/** /aktuality a /aktuality/:slug – doplní titulek a popis do HTML, aby je viděly vyhledávače i sociální sítě. */
async function postHtml(req: Request, env: Env, url: URL) {
  // index.html se v Cloudflare servíruje na adrese / (/index.html přesměrovává)
  const page = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: req.headers }))
  const site = env.SITE_URL.replace(/\/$/, '')
  let title = 'Aktuality a rady | Malířství Špejtek'
  let desc = 'Novinky, rady k malování a ukázky z realizací Malířství Špejtek v Jihlavě a na Vysočině.'
  let image: string | null = null
  let status = 200
  const slug = url.pathname.replace(/^\/aktuality\/?/, '').replace(/\/$/, '')
  if (slug) {
    const post = await getPublishedPost(env, decodeURIComponent(slug))
    if (post) {
      title = post.seo_title || `${post.title} | Malířství Špejtek`
      desc = post.seo_description || post.excerpt || desc
      image = post.cover ? new URL(post.cover, site).toString() : null
    } else status = 404
  }
  const set = (attr: string, v: string) => ({ element: (el: Element) => { el.setAttribute(attr, v) } })
  let rw = new HTMLRewriter()
    .on('title', { element: (el) => { el.setInnerContent(title) } })
    .on('meta[name="description"]', set('content', desc))
    .on('meta[property="og:title"]', set('content', title))
    .on('meta[property="og:description"]', set('content', desc))
    .on('link[rel="canonical"]', set('href', site + url.pathname))
  if (slug) rw = rw.on('meta[property="og:type"]', set('content', 'article'))
  if (image) rw = rw.on('meta[property="og:image"]', set('content', image))
  const res = rw.transform(page)
  return new Response(res.body, { status, headers: res.headers })
}

async function sitemap(env: Env, url: URL) {
  const site = (env.SITE_URL || url.origin).replace(/\/$/, '')
  const [services, posts] = await Promise.all([
    env.DB.prepare("SELECT data, updated_at FROM items WHERE collection = 'services' AND published = 1").all<{ data: string; updated_at: number }>(),
    env.DB.prepare('SELECT slug, updated_at FROM posts WHERE published = 1 AND published_at <= ? ORDER BY published_at DESC').bind(now()).all<{ slug: string; updated_at: number }>(),
  ])
  const day = (t?: number) => new Date((t ?? now()) * 1000).toISOString().slice(0, 10)
  const urls: { loc: string; lastmod?: string; priority: number }[] = STATIC_PAGES.map(([p, priority]) => ({ loc: p, priority }))
  const svc = services.results.length
    ? services.results.map((s) => ({ slug: JSON.parse(s.data).slug as string, t: s.updated_at }))
    : DEFAULT_SERVICE_SLUGS.map((slug) => ({ slug, t: undefined }))
  for (const s of svc) if (s.slug) urls.push({ loc: '/' + s.slug, lastmod: s.t ? day(s.t) : undefined, priority: 0.8 })
  if (posts.results.length) {
    urls.push({ loc: '/aktuality', lastmod: day(posts.results[0].updated_at), priority: 0.6 })
    for (const p of posts.results) urls.push({ loc: '/aktuality/' + encodeURIComponent(p.slug), lastmod: day(p.updated_at), priority: 0.6 })
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${site}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority.toFixed(1)}</priority></url>`).join('\n') +
    '\n</urlset>\n'
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}

/* ════════════════ poptávky ════════════════ */
const MAX_PHOTOS = 6
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

async function createInquiry(req: Request, env: Env, ctx: ExecutionContext) {
  const form = await req.formData().catch(() => { throw new HttpError(400, 'Neplatný formulář.') })
  if (str(form.get('website'))) return json({ ok: true }) // past na roboty
  const name = str(form.get('name'), 120)
  const phone = str(form.get('phone'), 40)
  const email = str(form.get('email'), 160)
  const message = str(form.get('message'), 4000)
  const design = str(form.get('design'), 6000)
  const page = str(form.get('page'), 200)
  if (!phone && !email) throw new HttpError(400, 'Vyplňte prosím telefon nebo e-mail, ať se vám můžu ozvat.')
  if (!message && !design) throw new HttpError(400, 'Napište prosím pár slov o tom, co potřebujete.')

  const ipHash = await sha256('inq:' + clientIp(req))
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM inquiries WHERE ip_hash = ? AND created_at > ?').bind(ipHash, now() - 3600).first<{ n: number }>()
  if ((recent?.n ?? 0) >= 5) throw new HttpError(429, 'Poslali jste už několik poptávek. Zkuste to prosím později nebo zavolejte.')

  const files = form.getAll('photos').filter((f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f).slice(0, MAX_PHOTOS)
  for (const f of files) {
    if (!f.type.startsWith('image/')) throw new HttpError(400, 'Přiložit lze jen fotky.')
    if (f.size > MAX_PHOTO_BYTES) throw new HttpError(400, 'Některá fotka je příliš velká (max. 5 MB).')
  }

  const res = await env.DB.prepare('INSERT INTO inquiries (name, phone, email, message, design, page, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(name, phone, email, message, design, page, ipHash).run()
  const id = res.meta.last_row_id
  const keys: string[] = []
  for (const [i, f] of files.entries()) {
    const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg'
    const key = `inquiries/${id}/${i + 1}-${randomToken(6)}.${ext}`
    await env.MEDIA.put(key, f.stream(), { httpMetadata: { contentType: f.type } })
    keys.push(key)
  }
  if (keys.length) await env.DB.prepare('UPDATE inquiries SET photos = ? WHERE id = ?').bind(JSON.stringify(keys), id).run()

  const notify = await getSetting<{ email?: string }>(env, 'notify')
  if (notify?.email) {
    const site = env.SITE_URL.replace(/\/$/, '')
    ctx.waitUntil(sendMail(
      env, notify.email,
      `Nová poptávka: ${name || phone || email}`,
      [`Jméno: ${name}`, `Telefon: ${phone}`, `E-mail: ${email}`, '', message, design ? '\n' + design : '', keys.length ? `\nFotek: ${keys.length}` : '',
        `\nOtevřít v administraci: ${site}/admin/poptavky/${id}`].join('\n'),
      email || undefined,
    ))
  }
  return json({ ok: true, id })
}

async function inquiries(req: Request, env: Env, seg: string[]) {
  const id = Number(seg[1])
  if (!seg[1] && req.method === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 500').all<Record<string, any>>()
    return json(r.results.map(inquiryOut))
  }
  if (!id) throw new HttpError(404, 'Poptávka nenalezena.')
  if (req.method === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first<Record<string, any>>()
    if (!r) throw new HttpError(404, 'Poptávka nenalezena.')
    return json(inquiryOut(r))
  }
  if (req.method === 'PATCH') {
    const b = await readJson<{ status?: string; note?: string }>(req)
    const status = ['new', 'contacted', 'offer', 'won', 'lost', 'archived'].includes(b.status ?? '') ? b.status! : null
    await env.DB.prepare('UPDATE inquiries SET status = COALESCE(?, status), note = COALESCE(?, note) WHERE id = ?')
      .bind(status, typeof b.note === 'string' ? b.note.slice(0, 4000) : null, id).run()
    return json({ ok: true })
  }
  if (req.method === 'DELETE') {
    const r = await env.DB.prepare('SELECT photos FROM inquiries WHERE id = ?').bind(id).first<{ photos: string }>()
    const keys = JSON.parse(r?.photos ?? '[]') as string[]
    if (keys.length) await env.MEDIA.delete(keys)
    await env.DB.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run()
    return json({ ok: true })
  }
  throw new HttpError(405, 'Nepodporovaná operace.')
}

const inquiryOut = (r: Record<string, any>) => ({
  id: r.id, name: r.name, phone: r.phone, email: r.email, message: r.message, design: r.design, page: r.page,
  photos: JSON.parse(r.photos || '[]'), status: r.status, note: r.note, createdAt: r.created_at,
})

/** Fotky z poptávek jsou soukromé – jen pro přihlášeného majitele. */
async function inquiryPhoto(env: Env, url: URL) {
  const key = url.searchParams.get('key') ?? ''
  if (!/^inquiries\/\d+\/[\w.-]+$/.test(key)) throw new HttpError(400, 'Neplatný soubor.')
  const obj = await env.MEDIA.get(key)
  if (!obj) throw new HttpError(404, 'Soubor nenalezen.')
  const h = new Headers()
  obj.writeHttpMetadata(h)
  h.set('cache-control', 'private, max-age=3600')
  h.set('x-content-type-options', 'nosniff')
  return new Response(obj.body, { headers: h })
}

/* ════════════════ recenze ════════════════ */
const REVIEW_STATUSES = ['pending', 'approved', 'hidden'] as const

async function createReview(req: Request, env: Env, ctx: ExecutionContext) {
  const b = await readJson<Record<string, unknown>>(req)
  if (str(b.website)) return json({ ok: true }) // past na roboty
  const name = str(b.name, 80)
  const place = str(b.place, 80)
  const service = str(b.service, 80)
  const email = str(b.email, 160)
  const text = str(b.text, 2000)
  const rating = Math.round(Number(b.rating))
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Vyberte prosím počet hvězdiček.')
  if (name.length < 2) throw new HttpError(400, 'Napište prosím své jméno (stačí křestní a první písmeno příjmení).')
  if (text.length < 10) throw new HttpError(400, 'Napište prosím aspoň jednu větu o tom, jak jste byli spokojeni.')
  if ((text.match(/https?:\/\/|www\./gi) ?? []).length > 1) throw new HttpError(400, 'Recenze nesmí obsahovat odkazy.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'E-mail nevypadá správně.')

  const ipHash = await sha256('rev:' + clientIp(req))
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM reviews WHERE ip_hash = ? AND created_at > ?').bind(ipHash, now() - 86400).first<{ n: number }>()
  if ((recent?.n ?? 0) >= 3) throw new HttpError(429, 'Z tohoto zařízení už dnes několik recenzí přišlo. Děkujeme!')

  const res = await env.DB.prepare('INSERT INTO reviews (name, place, service, rating, text, email, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(name, place, service, rating, text, email, ipHash).run()
  const id = res.meta.last_row_id

  const notify = await getSetting<{ email?: string }>(env, 'notify')
  if (notify?.email) {
    const site = env.SITE_URL.replace(/\/$/, '')
    ctx.waitUntil(sendMail(
      env, notify.email,
      `Nová recenze ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} od ${name}`,
      [`${name}${place ? ', ' + place : ''}${service ? ' – ' + service : ''}`, `Hodnocení: ${rating}/5`, '', text, '',
        'Na webu se zobrazí, až ji schválíte:', `${site}/admin/recenze/${id}`].join('\n'),
      email || undefined,
    ))
  }
  return json({ ok: true })
}

async function reviews(req: Request, env: Env, seg: string[]) {
  const id = Number(seg[1])
  if (!seg[1] && req.method === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM reviews ORDER BY created_at DESC LIMIT 1000').all<Record<string, any>>()
    return json(r.results.map(reviewAdmin))
  }
  if (!id) throw new HttpError(404, 'Recenze nenalezena.')
  if (req.method === 'PATCH') {
    const b = await readJson<{ status?: string; reply?: string; name?: string; place?: string }>(req)
    const status = (REVIEW_STATUSES as readonly string[]).includes(b.status ?? '') ? b.status! : null
    await env.DB.prepare(`UPDATE reviews SET
        status = COALESCE(?1, status),
        approved_at = CASE WHEN ?1 = 'approved' AND approved_at IS NULL THEN unixepoch() ELSE approved_at END,
        reply = COALESCE(?2, reply), name = COALESCE(?3, name), place = COALESCE(?4, place)
      WHERE id = ?5`)
      .bind(status, typeof b.reply === 'string' ? b.reply.trim().slice(0, 2000) : null,
        typeof b.name === 'string' && b.name.trim().length >= 2 ? b.name.trim().slice(0, 80) : null,
        typeof b.place === 'string' ? b.place.trim().slice(0, 80) : null, id).run()
    const r = await env.DB.prepare('SELECT * FROM reviews WHERE id = ?').bind(id).first<Record<string, any>>()
    if (!r) throw new HttpError(404, 'Recenze nenalezena.')
    return json(reviewAdmin(r))
  }
  if (req.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run()
    return json({ ok: true })
  }
  throw new HttpError(405, 'Nepodporovaná operace.')
}

/** Na web jde jen to, co je vidět – bez e-mailu a IP. */
const reviewPublic = (r: Record<string, any>) => ({
  id: r.id, name: r.name, place: r.place, service: r.service, rating: r.rating, text: r.text,
  reply: r.reply, date: r.approved_at ?? r.created_at,
})
const reviewAdmin = (r: Record<string, any>) => ({
  id: r.id, name: r.name, place: r.place, service: r.service, rating: r.rating, text: r.text, email: r.email,
  status: r.status, reply: r.reply, createdAt: r.created_at, approvedAt: r.approved_at,
})

/* ════════════════ přihlášení ════════════════ */
/** Přihlašovací jméno: uživatelské jméno (např. admin268) nebo e-mail. */
const LOGIN_RE = /^[a-z0-9._+@-]{3,160}$/
function validLogin(login: string) {
  if (!LOGIN_RE.test(login)) throw new HttpError(400, 'Přihlašovací jméno smí obsahovat písmena bez diakritiky, číslice a znaky . _ - @ (3–160 znaků).')
}

function validPassword(pw: string) {
  if (pw.length < 10) throw new HttpError(400, 'Heslo musí mít aspoň 10 znaků.')
}

async function setup(req: Request, env: Env) {
  const exists = await env.DB.prepare('SELECT 1 FROM admin WHERE id = 1').first()
  if (exists) throw new HttpError(409, 'Účet už existuje.')
  if (!env.ADMIN_SETUP_CODE) throw new HttpError(409, 'Na serveru není nastavený ADMIN_SETUP_CODE.')
  const b = await readJson<{ code?: string; email?: string; password?: string }>(req)
  if (!safeEqual(str(b.code, 200), env.ADMIN_SETUP_CODE)) throw new HttpError(403, 'Instalační kód nesouhlasí.')
  const email = str(b.email, 160).toLowerCase()
  validLogin(email)
  const pw = typeof b.password === 'string' ? b.password : ''
  validPassword(pw)
  const h = await hashPassword(pw)
  await env.DB.prepare('INSERT INTO admin (id, email, pass_hash, pass_salt, iterations) VALUES (1, ?, ?, ?, ?)').bind(email, h.hash, h.salt, h.iterations).run()
  if (email.includes('@') && !(await getSetting(env, 'notify'))) await setSetting(env, 'notify', { email })
  return json({ ok: true }, { headers: { 'set-cookie': await createSession(env, req) } })
}

async function login(req: Request, env: Env) {
  const ip = clientIp(req)
  const t = now()
  const fails = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?').bind(ip, t - 900).first<{ n: number }>()
  if ((fails?.n ?? 0) >= 8) throw new HttpError(429, 'Příliš mnoho pokusů. Zkuste to za 15 minut.')
  const b = await readJson<{ email?: string; password?: string }>(req)
  const admin = await env.DB.prepare('SELECT * FROM admin WHERE id = 1').first<{ email: string; pass_hash: string; pass_salt: string; iterations: number }>()
  const ok = !!admin && admin.email === str(b.email, 160).toLowerCase() &&
    safeEqual((await hashPassword(typeof b.password === 'string' ? b.password : '', admin.pass_salt, admin.iterations)).hash, admin.pass_hash)
  if (!ok) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO login_attempts (ip, at) VALUES (?, ?)').bind(ip, t),
      env.DB.prepare('DELETE FROM login_attempts WHERE at < ?').bind(t - 86400),
    ])
    throw new HttpError(401, 'Jméno nebo heslo nesouhlasí.')
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run()
  return json({ ok: true, user: { email: admin.email } }, { headers: { 'set-cookie': await createSession(env, req) } })
}

async function changePassword(req: Request, env: Env) {
  const b = await readJson<{ current?: string; next?: string; email?: string }>(req)
  const admin = await env.DB.prepare('SELECT * FROM admin WHERE id = 1').first<{ email: string; pass_hash: string; pass_salt: string; iterations: number }>()
  if (!admin) throw new HttpError(404, 'Účet neexistuje.')
  const cur = await hashPassword(typeof b.current === 'string' ? b.current : '', admin.pass_salt, admin.iterations)
  if (!safeEqual(cur.hash, admin.pass_hash)) throw new HttpError(403, 'Současné heslo nesouhlasí.')
  const next = typeof b.next === 'string' && b.next ? b.next : null
  const email = str(b.email, 160).toLowerCase() || admin.email
  validLogin(email)
  if (next) {
    validPassword(next)
    const h = await hashPassword(next)
    await env.DB.prepare('UPDATE admin SET email = ?, pass_hash = ?, pass_salt = ?, iterations = ?, updated_at = unixepoch() WHERE id = 1').bind(email, h.hash, h.salt, h.iterations).run()
    // odhlásit ostatní zařízení, aktuální relaci obnovit
    await env.DB.prepare('DELETE FROM sessions').run()
    return json({ ok: true }, { headers: { 'set-cookie': await createSession(env, req) } })
  }
  await env.DB.prepare('UPDATE admin SET email = ?, updated_at = unixepoch() WHERE id = 1').bind(email).run()
  return json({ ok: true })
}

/* ════════════════ obsah (realizace, služby, FAQ) ════════════════ */
function itemId(input: unknown) {
  const s = str(input, 80).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return s || randomToken(6).toLowerCase()
}

async function items(req: Request, env: Env, seg: string[]) {
  const col = seg[1] ?? ''
  if (!isCollection(col)) throw new HttpError(404, 'Neznámá sbírka.')
  const id = seg[2]

  if (!id && req.method === 'GET') {
    const r = await env.DB.prepare('SELECT id, sort, published, data, updated_at FROM items WHERE collection = ? ORDER BY sort, id').bind(col).all<{ id: string; sort: number; published: number; data: string; updated_at: number }>()
    return json(r.results.map((x) => ({ id: x.id, sort: x.sort, published: !!x.published, updatedAt: x.updated_at, data: JSON.parse(x.data) })))
  }
  if (id === 'order' && req.method === 'POST') {
    const b = await readJson<{ ids?: string[] }>(req)
    const ids = (b.ids ?? []).slice(0, 500)
    await env.DB.batch(ids.map((x, i) => env.DB.prepare('UPDATE items SET sort = ? WHERE collection = ? AND id = ?').bind(i, col, x)))
    return json({ ok: true })
  }
  if (!id && req.method === 'POST') {
    const b = await readJson<{ id?: string; data?: Record<string, unknown>; published?: boolean }>(req)
    const data = cleanItem(col, b.data ?? {})
    let newId = itemId(b.id || (data.title as string) || (data.q as string))
    if (await env.DB.prepare('SELECT 1 FROM items WHERE collection = ? AND id = ?').bind(col, newId).first()) newId += '-' + randomToken(3).toLowerCase()
    const max = await env.DB.prepare('SELECT COALESCE(MIN(sort), 0) AS s FROM items WHERE collection = ?').bind(col).first<{ s: number }>()
    // nové realizace nahoru, ostatní na konec
    const sort = col === 'realizace' ? (max?.s ?? 0) - 1 : 100000
    await env.DB.prepare('INSERT INTO items (collection, id, sort, published, data) VALUES (?, ?, ?, ?, ?)').bind(col, newId, sort, b.published === false ? 0 : 1, JSON.stringify(data)).run()
    if (col !== 'realizace') await renumber(env, col)
    return json({ ok: true, id: newId })
  }
  if (id && req.method === 'PUT') {
    const b = await readJson<{ data?: Record<string, unknown>; published?: boolean }>(req)
    const r = await env.DB.prepare('UPDATE items SET data = ?, published = ?, updated_at = unixepoch() WHERE collection = ? AND id = ?')
      .bind(JSON.stringify(cleanItem(col, b.data ?? {})), b.published === false ? 0 : 1, col, id).run()
    if (!r.meta.changes) throw new HttpError(404, 'Položka nenalezena.')
    return json({ ok: true })
  }
  if (id && req.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM items WHERE collection = ? AND id = ?').bind(col, id).run()
    return json({ ok: true })
  }
  throw new HttpError(405, 'Nepodporovaná operace.')
}

async function renumber(env: Env, col: string) {
  const r = await env.DB.prepare('SELECT id FROM items WHERE collection = ? ORDER BY sort, id').bind(col).all<{ id: string }>()
  await env.DB.batch(r.results.map((x, i) => env.DB.prepare('UPDATE items SET sort = ? WHERE collection = ? AND id = ?').bind(i, col, x.id)))
}

/** Uloží jen známá pole se sanitizací délky (obsah se na webu vždy vykresluje jako text). */
function cleanItem(col: Collection, d: Record<string, unknown>): Record<string, unknown> {
  const list = (v: unknown, max = 20) => (Array.isArray(v) ? v.map((x) => str(x, 300)).filter(Boolean).slice(0, max) : [])
  const img = (v: unknown) => { const s = str(v, 500); return s.startsWith('/') || s.startsWith('https://') ? s : '' }
  if (col === 'realizace') {
    return {
      title: str(d.title, 120), kind: str(d.kind, 60), image: img(d.image), before: img(d.before) || undefined,
      focus: str(d.focus, 20) || undefined, wide: !!d.wide, place: str(d.place, 80) || undefined, text: str(d.text, 600) || undefined,
    }
  }
  if (col === 'services') {
    const slug = itemId(d.slug)
    return {
      slug, title: str(d.title, 120), text: str(d.text, 400), short: str(d.short, 120), description: str(d.description, 1500),
      details: list(d.details), image: img(d.image), kinds: list(d.kinds, 10), seoTitle: str(d.seoTitle, 120), seoDescription: str(d.seoDescription, 320),
    }
  }
  return { q: str(d.q, 300), a: str(d.a, 2000) }
}

/** První spuštění: naplní prázdné sbírky současným obsahem webu (posílá ho administrace z balíčku webu). */
async function seed(req: Request, env: Env) {
  const b = await readJson<Partial<Record<Collection, { id?: string; data: Record<string, unknown> }[]>>>(req)
  const done: string[] = []
  for (const col of COLLECTIONS) {
    const list = b[col]
    if (!Array.isArray(list) || !list.length) continue
    const has = await env.DB.prepare('SELECT 1 FROM items WHERE collection = ? LIMIT 1').bind(col).first()
    if (has) continue
    await env.DB.batch(list.slice(0, 200).map((x, i) =>
      env.DB.prepare('INSERT OR IGNORE INTO items (collection, id, sort, published, data) VALUES (?, ?, ?, 1, ?)')
        .bind(col, itemId(x.id || x.data.title || x.data.q), i, JSON.stringify(cleanItem(col, x.data)))))
    done.push(col)
  }
  return json({ ok: true, seeded: done })
}

/* ════════════════ aktuality ════════════════ */
function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

async function posts(req: Request, env: Env, seg: string[]) {
  const id = Number(seg[1])
  if (!seg[1] && req.method === 'GET') {
    const r = await env.DB.prepare('SELECT id, slug, title, excerpt, cover, published, published_at, updated_at FROM posts ORDER BY COALESCE(published_at, created_at) DESC').all()
    return json(r.results)
  }
  if (!seg[1] && req.method === 'POST') {
    const b = await readJson<Record<string, unknown>>(req)
    const p = cleanPost(b)
    const slug = await uniqueSlug(env, p.slug || slugify(p.title) || 'clanek')
    const r = await env.DB.prepare('INSERT INTO posts (slug, title, excerpt, body, cover, published, published_at, seo_title, seo_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(slug, p.title || 'Nový článek', p.excerpt, p.body, p.cover, p.published, p.published ? p.publishedAt ?? now() : p.publishedAt, p.seoTitle, p.seoDescription).run()
    return json({ ok: true, id: r.meta.last_row_id, slug })
  }
  if (!id) throw new HttpError(404, 'Článek nenalezen.')
  if (req.method === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first()
    if (!r) throw new HttpError(404, 'Článek nenalezen.')
    return json(r)
  }
  if (req.method === 'PUT') {
    const b = await readJson<Record<string, unknown>>(req)
    const p = cleanPost(b)
    const slug = await uniqueSlug(env, p.slug || slugify(p.title) || 'clanek', id)
    await env.DB.prepare(`UPDATE posts SET slug = ?, title = ?, excerpt = ?, body = ?, cover = ?, published = ?,
      published_at = CASE WHEN ? IS NOT NULL THEN ? WHEN ? = 1 THEN COALESCE(published_at, unixepoch()) ELSE published_at END,
      seo_title = ?, seo_description = ?, updated_at = unixepoch() WHERE id = ?`)
      .bind(slug, p.title, p.excerpt, p.body, p.cover, p.published, p.publishedAt, p.publishedAt, p.published, p.seoTitle, p.seoDescription, id).run()
    return json({ ok: true, slug })
  }
  if (req.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run()
    return json({ ok: true })
  }
  throw new HttpError(405, 'Nepodporovaná operace.')
}

function cleanPost(b: Record<string, unknown>) {
  const cover = str(b.cover, 500)
  const at = Number(b.publishedAt)
  return {
    slug: slugify(str(b.slug, 120)),
    title: str(b.title, 160),
    excerpt: str(b.excerpt, 400),
    body: str(b.body, 60000),
    cover: cover.startsWith('/') || cover.startsWith('https://') ? cover : null,
    published: b.published ? 1 : 0,
    publishedAt: at > 0 ? Math.floor(at) : null,
    seoTitle: str(b.seoTitle, 120) || null,
    seoDescription: str(b.seoDescription, 320) || null,
  }
}

async function uniqueSlug(env: Env, base: string, selfId?: number) {
  let slug = base
  for (let i = 2; i < 50; i++) {
    const r = await env.DB.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first<{ id: number }>()
    if (!r || r.id === selfId) return slug
    slug = `${base}-${i}`
  }
  return base + '-' + randomToken(3).toLowerCase()
}

/* ════════════════ nastavení ════════════════ */
async function settings(req: Request, env: Env) {
  if (req.method === 'GET') {
    const [business, notify, pageSeo, admin] = await Promise.all([
      getSetting<Business>(env, 'business'),
      getSetting<{ email?: string }>(env, 'notify'),
      getSetting(env, 'pageSeo'),
      env.DB.prepare('SELECT email FROM admin WHERE id = 1').first<{ email: string }>(),
    ])
    return json({ business: business ?? {}, notify: notify ?? {}, pageSeo: pageSeo ?? {}, account: { email: admin?.email ?? '' }, mailConfigured: !!env.RESEND_API_KEY })
  }
  if (req.method === 'PUT') {
    const b = await readJson<{ business?: Business; notify?: { email?: string }; pageSeo?: Record<string, { title?: string; description?: string }> }>(req)
    if (b.business) {
      const x = b.business
      await setSetting(env, 'business', {
        name: str(x.name, 120), tagline: str(x.tagline, 200), phoneDisplay: str(x.phoneDisplay, 40),
        phoneTel: str(x.phoneTel, 40).replace(/[^\d+]/g, ''), area: str(x.area, 120), email: str(x.email, 160),
      })
    }
    if (b.notify) await setSetting(env, 'notify', { email: str(b.notify.email, 160) })
    if (b.pageSeo) {
      const out: Record<string, { title: string; description: string }> = {}
      for (const [path, v] of Object.entries(b.pageSeo).slice(0, 100)) {
        if (!path.startsWith('/')) continue
        const title = str(v?.title, 120)
        const description = str(v?.description, 320)
        if (title || description) out[path.slice(0, 200)] = { title, description }
      }
      await setSetting(env, 'pageSeo', out)
    }
    return json({ ok: true })
  }
  throw new HttpError(405, 'Nepodporovaná operace.')
}

async function stats(env: Env) {
  const t = now()
  const [inq, newInq, week, posts, real, latest, pendingRev] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS n FROM inquiries').first<{ n: number }>(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE status = 'new'").first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM inquiries WHERE created_at > ?').bind(t - 7 * 86400).first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM posts WHERE published = 1').first<{ n: number }>(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM items WHERE collection = 'realizace'").first<{ n: number }>(),
    env.DB.prepare('SELECT id, name, phone, message, status, created_at FROM inquiries ORDER BY created_at DESC LIMIT 5').all(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'").first<{ n: number }>().catch(() => null),
  ])
  return json({
    inquiries: inq?.n ?? 0, newInquiries: newInq?.n ?? 0, inquiriesWeek: week?.n ?? 0,
    posts: posts?.n ?? 0, realizace: real?.n ?? 0, latest: latest.results, pendingReviews: pendingRev?.n ?? 0,
  })
}

/* ════════════════ fotky (R2) ════════════════ */
const IMAGE_TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/avif': 'avif', 'image/gif': 'gif' }

async function adminMedia(req: Request, env: Env, url: URL) {
  if (req.method === 'POST') {
    const type = (req.headers.get('content-type') ?? '').split(';')[0]
    const ext = IMAGE_TYPES[type]
    if (!ext) throw new HttpError(400, 'Nahrát lze jen obrázek (WebP, JPEG, PNG, AVIF).')
    const size = Number(req.headers.get('content-length') ?? 0)
    if (size > 15 * 1024 * 1024) throw new HttpError(413, 'Obrázek je příliš velký (max. 15 MB).')
    const base = slugify(url.searchParams.get('name') ?? '').slice(0, 40) || 'foto'
    const d = new Date()
    const key = `m/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${base}-${randomToken(5).toLowerCase()}.${ext}`
    const body = await req.arrayBuffer()
    if (body.byteLength > 15 * 1024 * 1024) throw new HttpError(413, 'Obrázek je příliš velký (max. 15 MB).')
    await env.MEDIA.put(key, body, {
      httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { width: url.searchParams.get('w') ?? '', height: url.searchParams.get('h') ?? '' },
    })
    return json({ ok: true, url: '/media/' + key, key })
  }
  if (req.method === 'GET') {
    const list = await env.MEDIA.list({ prefix: 'm/', limit: 500, include: ['customMetadata'] })
    return json(list.objects.sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime()).map((o) => ({
      key: o.key, url: '/media/' + o.key, size: o.size, uploaded: o.uploaded.toISOString(),
      width: Number(o.customMetadata?.width) || null, height: Number(o.customMetadata?.height) || null,
    })))
  }
  if (req.method === 'DELETE') {
    const key = url.searchParams.get('key') ?? ''
    if (!key.startsWith('m/')) throw new HttpError(400, 'Neplatný soubor.')
    await env.MEDIA.delete(key)
    return json({ ok: true })
  }
  throw new HttpError(405, 'Nepodporovaná operace.')
}

/** Veřejné fotky webu: /media/m/… (soukromé fotky z poptávek přes tuto cestu dostupné nejsou). */
async function media(req: Request, env: Env, url: URL) {
  const key = decodeURIComponent(url.pathname.slice('/media/'.length))
  if (!key.startsWith('m/') || key.includes('..')) return new Response('Nenalezeno', { status: 404 })
  const obj = await env.MEDIA.get(key, { onlyIf: req.headers })
  if (!obj) return new Response('Nenalezeno', { status: 404 })
  const h = new Headers()
  obj.writeHttpMetadata(h)
  h.set('etag', obj.httpEtag)
  h.set('cache-control', 'public, max-age=31536000, immutable')
  h.set('x-content-type-options', 'nosniff')
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers: h })
  return new Response(obj.body, { headers: h })
}
