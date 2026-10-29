/** Napojení na Google: OAuth (jeden účet majitele), Search Console a Google Ads. */
import { type Env, HttpError, deleteSetting, getSetting, now, randomToken, setSetting } from './lib'

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/webmasters', // Search Console (čtení + odeslání sitemapy)
  'https://www.googleapis.com/auth/adwords', // Google Ads
]

interface GoogleAuth { refreshToken: string; email: string; scopes: string; connectedAt: number }
export interface GoogleConfig { gscSite?: string; adsCustomerId?: string; adsLoginCustomerId?: string }

const redirectUri = (req: Request) => new URL(req.url).origin + '/api/google/callback'

/* ───────── OAuth ───────── */
export async function startOAuth(env: Env, req: Request) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new HttpError(400, 'Na serveru chybí GOOGLE_CLIENT_ID a GOOGLE_CLIENT_SECRET.')
  const state = randomToken(16)
  await setSetting(env, 'googleState', { state, exp: now() + 600 })
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  u.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  }).toString()
  return Response.redirect(u.toString(), 302)
}

export async function finishOAuth(env: Env, req: Request) {
  const url = new URL(req.url)
  const back = (q: string) => Response.redirect(url.origin + '/admin/google?' + q, 302)
  const saved = await getSetting<{ state: string; exp: number }>(env, 'googleState')
  await deleteSetting(env, 'googleState')
  if (url.searchParams.get('error')) return back('chyba=' + encodeURIComponent(url.searchParams.get('error')!))
  if (!saved || saved.exp < now() || saved.state !== url.searchParams.get('state')) return back('chyba=state')
  const code = url.searchParams.get('code')
  if (!code) return back('chyba=code')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(req),
      grant_type: 'authorization_code',
    }),
  })
  const tok = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; scope?: string; error?: string }
  if (!res.ok || !tok.refresh_token) return back('chyba=' + encodeURIComponent(tok.error ?? 'token'))

  let email = ''
  try {
    const payload = tok.id_token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    email = JSON.parse(atob(payload)).email ?? ''
  } catch { /* e-mail je jen informativní */ }

  await setSetting(env, 'google', { refreshToken: tok.refresh_token, email, scopes: tok.scope ?? '', connectedAt: now() } satisfies GoogleAuth)
  await setSetting(env, 'googleAccess', { token: tok.access_token, exp: now() + (tok.expires_in ?? 3600) - 120 })
  return back('pripojeno=1')
}

export async function disconnect(env: Env) {
  const auth = await getSetting<GoogleAuth>(env, 'google')
  if (auth) await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(auth.refreshToken), { method: 'POST' }).catch(() => {})
  await deleteSetting(env, 'google')
  await deleteSetting(env, 'googleAccess')
}

async function accessToken(env: Env) {
  const cached = await getSetting<{ token: string; exp: number }>(env, 'googleAccess')
  if (cached && cached.exp > now()) return cached.token
  const auth = await getSetting<GoogleAuth>(env, 'google')
  if (!auth) throw new HttpError(409, 'Google účet není připojený. Připojte ho v sekci Google.')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: auth.refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const tok = (await res.json()) as { access_token?: string; expires_in?: number; error?: string }
  if (!res.ok || !tok.access_token) {
    if (tok.error === 'invalid_grant') {
      await deleteSetting(env, 'google')
      throw new HttpError(409, 'Přístup ke Googlu vypršel nebo byl odvolán. Připojte účet znovu.')
    }
    throw new HttpError(502, 'Google odmítl obnovit přístup (' + (tok.error ?? res.status) + ').')
  }
  await setSetting(env, 'googleAccess', { token: tok.access_token, exp: now() + (tok.expires_in ?? 3600) - 120 })
  return tok.access_token
}

export async function googleStatus(env: Env) {
  const auth = await getSetting<GoogleAuth>(env, 'google')
  const cfg = (await getSetting<GoogleConfig>(env, 'googleConfig')) ?? {}
  return {
    oauthConfigured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    adsDeveloperToken: !!env.GOOGLE_ADS_DEVELOPER_TOKEN,
    connected: !!auth,
    email: auth?.email ?? '',
    connectedAt: auth?.connectedAt ?? null,
    hasAdsScope: !!auth?.scopes.includes('adwords'),
    ...cfg,
  }
}

async function gfetch<T>(env: Env, url: string, init: RequestInit = {}, extra: Record<string, string> = {}): Promise<T> {
  const token = await accessToken(env)
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...extra, ...(init.headers as Record<string, string>) },
  })
  const text = await res.text()
  let body: unknown = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) throw new HttpError(res.status === 401 ? 409 : 502, googleError(body, res.status), body)
  return body as T
}

/** Srozumitelná česká hláška z chybové odpovědi Googlu. */
function googleError(body: unknown, status: number): string {
  const raw = JSON.stringify(body ?? '')
  if (raw.includes('DEVELOPER_TOKEN_NOT_APPROVED') || raw.includes('DEVELOPER_TOKEN_PROHIBITED'))
    return 'Vývojářský token Google Ads zatím nemá schválený přístup k produkčním účtům (stav „Test“). Požádejte o Basic access v API Center.'
  if (raw.includes('DEVELOPER_TOKEN_INVALID') || raw.includes('DEVELOPER_TOKEN_PARAMETER_MISSING'))
    return 'Chybí nebo je neplatný GOOGLE_ADS_DEVELOPER_TOKEN na serveru.'
  if (raw.includes('USER_PERMISSION_DENIED'))
    return 'Připojený Google účet nemá k tomuto účtu Ads přístup. Pokud je spravován přes MCC, vyplňte ID manažerského účtu.'
  if (raw.includes('CUSTOMER_NOT_ENABLED')) return 'Účet Google Ads není aktivní (např. nedokončené nastavení plateb).'
  if (raw.includes('SERVICE_DISABLED') || raw.includes('has not been used in project'))
    return 'V Google Cloud projektu není zapnuté potřebné API (Google Ads API / Search Console API).'
  if (status === 403) return 'Google odepřel přístup. Ověřte, že je připojený účet vlastníkem nebo uživatelem služby.'
  if (status === 401) return 'Přístup ke Googlu vypršel. Připojte účet znovu.'
  const msg = (body as { error?: { message?: string } })?.error?.message
  return 'Google vrátil chybu' + (msg ? ': ' + msg : ` (${status}).`)
}

/* ───────── datumy ───────── */
const iso = (d: Date) => d.toISOString().slice(0, 10)
export function range(days: number, lagDays = 0) {
  const end = new Date(Date.now() - lagDays * 86400_000)
  const start = new Date(end.getTime() - (days - 1) * 86400_000)
  const pEnd = new Date(start.getTime() - 86400_000)
  const pStart = new Date(pEnd.getTime() - (days - 1) * 86400_000)
  return { start: iso(start), end: iso(end), prevStart: iso(pStart), prevEnd: iso(pEnd) }
}
const clampDays = (v: string | null, def: number) => Math.min(Math.max(Number(v) || def, 7), 180)

/* ───────── Search Console ───────── */
const GSC = 'https://www.googleapis.com/webmasters/v3'

type GscRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }

export async function gscSites(env: Env) {
  const r = await gfetch<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(env, GSC + '/sites')
  return (r.siteEntry ?? []).filter((s) => s.permissionLevel !== 'siteUnverifiedUser')
}

async function requireConnected(env: Env) {
  if (!(await getSetting<GoogleAuth>(env, 'google'))) throw new HttpError(409, 'Google účet není připojený. Připojte ho v sekci Google.')
}

async function gscSite(env: Env) {
  await requireConnected(env)
  const cfg = await getSetting<GoogleConfig>(env, 'googleConfig')
  if (!cfg?.gscSite) throw new HttpError(409, 'Vyberte web (vlastnost) Search Console v sekci Google → Nastavení.')
  return cfg.gscSite
}

export async function gscReport(env: Env, url: URL) {
  const site = await gscSite(env)
  const days = clampDays(url.searchParams.get('days'), 28)
  const r = range(days, 2) // data v Search Console mají zpoždění ~2 dny
  const q = (body: object) =>
    gfetch<{ rows?: GscRow[] }>(env, `${GSC}/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      method: 'POST',
      body: JSON.stringify({ dataState: 'all', ...body }),
    }).then((x) => x.rows ?? [])
  const cur = { startDate: r.start, endDate: r.end }
  const [total, prev, daily, queries, pages, devices] = await Promise.all([
    q(cur),
    q({ startDate: r.prevStart, endDate: r.prevEnd }),
    q({ ...cur, dimensions: ['date'], rowLimit: 500 }),
    q({ ...cur, dimensions: ['query'], rowLimit: 50 }),
    q({ ...cur, dimensions: ['page'], rowLimit: 25 }),
    q({ ...cur, dimensions: ['device'] }),
  ])
  const pick = (x?: GscRow) => ({ clicks: x?.clicks ?? 0, impressions: x?.impressions ?? 0, ctr: x?.ctr ?? 0, position: x?.position ?? 0 })
  const row = (x: GscRow) => ({ key: x.keys?.[0] ?? '', ...pick(x) })
  return {
    site,
    range: r,
    total: pick(total[0]),
    previous: pick(prev[0]),
    daily: daily.map(row).sort((a, b) => a.key.localeCompare(b.key)),
    queries: queries.map(row),
    pages: pages.map(row),
    devices: devices.map(row),
  }
}

export async function gscSitemaps(env: Env) {
  const site = await gscSite(env)
  const r = await gfetch<{ sitemap?: { path: string; lastSubmitted?: string; lastDownloaded?: string; isPending?: boolean; errors?: string; warnings?: string; contents?: { submitted?: string; indexed?: string }[] }[] }>(
    env, `${GSC}/sites/${encodeURIComponent(site)}/sitemaps`,
  )
  return r.sitemap ?? []
}

export async function gscSubmitSitemap(env: Env, sitemapUrl: string) {
  const site = await gscSite(env)
  await gfetch(env, `${GSC}/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(sitemapUrl)}`, { method: 'PUT' })
}

export async function gscInspect(env: Env, pageUrl: string) {
  const site = await gscSite(env)
  const r = await gfetch<{ inspectionResult?: { inspectionResultLink?: string; indexStatusResult?: Record<string, unknown>; mobileUsabilityResult?: { verdict?: string } } }>(
    env, 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
    { method: 'POST', body: JSON.stringify({ inspectionUrl: pageUrl, siteUrl: site, languageCode: 'cs' }) },
  )
  return r.inspectionResult ?? {}
}

/* ───────── Google Ads ───────── */
const digits = (s?: string) => (s ?? '').replace(/\D/g, '')

async function adsCall<T>(env: Env, path: string, body?: object): Promise<T> {
  if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) throw new HttpError(409, 'Na serveru chybí GOOGLE_ADS_DEVELOPER_TOKEN (vývojářský token z Google Ads API Center).')
  const cfg = (await getSetting<GoogleConfig>(env, 'googleConfig')) ?? {}
  const v = env.GOOGLE_ADS_API_VERSION || 'v26'
  const headers: Record<string, string> = { 'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN }
  if (digits(cfg.adsLoginCustomerId)) headers['login-customer-id'] = digits(cfg.adsLoginCustomerId)
  return gfetch<T>(env, `https://googleads.googleapis.com/${v}/${path}`, body ? { method: 'POST', body: JSON.stringify(body) } : {}, headers)
}

async function adsCustomer(env: Env) {
  await requireConnected(env)
  const cfg = await getSetting<GoogleConfig>(env, 'googleConfig')
  const id = digits(cfg?.adsCustomerId)
  if (!id) throw new HttpError(409, 'Vyplňte ID účtu Google Ads v sekci Google → Nastavení.')
  return id
}

async function gaql<T = Record<string, any>>(env: Env, cid: string, query: string): Promise<T[]> {
  const out: T[] = []
  let pageToken: string | undefined
  do {
    const r = await adsCall<{ results?: T[]; nextPageToken?: string }>(env, `customers/${cid}/googleAds:search`, { query, ...(pageToken ? { pageToken } : {}) })
    out.push(...(r.results ?? []))
    pageToken = r.nextPageToken
  } while (pageToken && out.length < 5000)
  return out
}

export async function adsAccounts(env: Env) {
  const r = await adsCall<{ resourceNames?: string[] }>(env, 'customers:listAccessibleCustomers')
  const ids = (r.resourceNames ?? []).map((n) => n.split('/')[1])
  return Promise.all(ids.map(async (id) => {
    try {
      const [c] = await gaql<any>(env, id, 'SELECT customer.descriptive_name, customer.currency_code, customer.manager FROM customer LIMIT 1')
      return { id, name: c?.customer?.descriptiveName ?? '', currency: c?.customer?.currencyCode ?? '', manager: !!c?.customer?.manager }
    } catch {
      return { id, name: '', currency: '', manager: false }
    }
  }))
}

const n = (v: unknown) => Number(v ?? 0) || 0
const money = (micros: unknown) => n(micros) / 1_000_000

export async function adsReport(env: Env, url: URL) {
  const cid = await adsCustomer(env)
  const days = clampDays(url.searchParams.get('days'), 30)
  const r = range(days, 0)
  const during = `segments.date BETWEEN '${r.start}' AND '${r.end}'`
  const prevDuring = `segments.date BETWEEN '${r.prevStart}' AND '${r.prevEnd}'`
  const [info, campaigns, metrics, daily, prev, terms] = await Promise.all([
    gaql<any>(env, cid, 'SELECT customer.descriptive_name, customer.currency_code FROM customer LIMIT 1'),
    gaql<any>(env, cid, `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.serving_status,
      campaign_budget.resource_name, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED'`),
    gaql<any>(env, cid, `SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM campaign WHERE ${during} AND campaign.status != 'REMOVED'`),
    gaql<any>(env, cid, `SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM customer WHERE ${during}`),
    gaql<any>(env, cid, `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM customer WHERE ${prevDuring}`),
    gaql<any>(env, cid, `SELECT search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM search_term_view WHERE ${during} ORDER BY metrics.clicks DESC LIMIT 30`).catch(() => []),
  ])
  const m = (x: any) => ({
    impressions: n(x?.metrics?.impressions),
    clicks: n(x?.metrics?.clicks),
    cost: money(x?.metrics?.costMicros),
    conversions: n(x?.metrics?.conversions),
  })
  const sum = (rows: any[]) => rows.map(m).reduce((a, b) => ({
    impressions: a.impressions + b.impressions, clicks: a.clicks + b.clicks, cost: a.cost + b.cost, conversions: a.conversions + b.conversions,
  }), { impressions: 0, clicks: 0, cost: 0, conversions: 0 })
  const byCampaign = new Map<string, ReturnType<typeof m>>()
  for (const x of metrics) {
    const id = String(x.campaign?.id)
    const a = byCampaign.get(id) ?? { impressions: 0, clicks: 0, cost: 0, conversions: 0 }
    const b = m(x)
    byCampaign.set(id, { impressions: a.impressions + b.impressions, clicks: a.clicks + b.clicks, cost: a.cost + b.cost, conversions: a.conversions + b.conversions })
  }
  return {
    customerId: cid,
    name: info[0]?.customer?.descriptiveName ?? '',
    currency: info[0]?.customer?.currencyCode ?? 'CZK',
    range: r,
    total: sum(daily),
    previous: sum(prev),
    daily: daily.map((x) => ({ key: x.segments?.date as string, ...m(x) })).sort((a, b) => a.key.localeCompare(b.key)),
    campaigns: campaigns.map((c) => ({
      id: String(c.campaign?.id),
      name: c.campaign?.name ?? '',
      status: c.campaign?.status ?? '',
      servingStatus: c.campaign?.servingStatus ?? '',
      channel: c.campaign?.advertisingChannelType ?? '',
      budgetResource: c.campaignBudget?.resourceName ?? '',
      dailyBudget: money(c.campaignBudget?.amountMicros),
      ...(byCampaign.get(String(c.campaign?.id)) ?? { impressions: 0, clicks: 0, cost: 0, conversions: 0 }),
    })).sort((a, b) => (a.status === b.status ? b.cost - a.cost : a.status === 'ENABLED' ? -1 : 1)),
    searchTerms: terms.map((t) => ({ key: t.searchTermView?.searchTerm ?? '', ...m(t) })),
  }
}

export async function adsSetCampaignStatus(env: Env, campaignId: string, status: 'ENABLED' | 'PAUSED') {
  const cid = await adsCustomer(env)
  await adsCall(env, `customers/${cid}/campaigns:mutate`, {
    operations: [{ update: { resourceName: `customers/${cid}/campaigns/${digits(campaignId)}`, status }, updateMask: 'status' }],
  })
}

export async function adsSetBudget(env: Env, budgetResource: string, dailyAmount: number) {
  const cid = await adsCustomer(env)
  if (!budgetResource.startsWith(`customers/${cid}/campaignBudgets/`)) throw new HttpError(400, 'Neplatný rozpočet.')
  if (!(dailyAmount > 0) || dailyAmount > 1_000_000) throw new HttpError(400, 'Zadejte rozumnou denní částku.')
  await adsCall(env, `customers/${cid}/campaignBudgets:mutate`, {
    operations: [{ update: { resourceName: budgetResource, amountMicros: String(Math.round(dailyAmount * 100) * 10_000) }, updateMask: 'amountMicros' }],
  })
}
