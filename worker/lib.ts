/** Společné pomocníky workeru: prostředí, odpovědi, nastavení, kryptografie, přihlášení. */

export interface Env {
  ASSETS: Fetcher
  DB: D1Database
  MEDIA: R2Bucket
  SITE_URL: string
  GOOGLE_ADS_API_VERSION?: string
  /** jednorázový kód pro založení účtu majitele (wrangler secret put ADMIN_SETUP_CODE) */
  ADMIN_SETUP_CODE?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_ADS_DEVELOPER_TOKEN?: string
  /** e-mailové upozornění na poptávky přes Resend (volitelné) */
  RESEND_API_KEY?: string
  MAIL_FROM?: string
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message)
  }
}

export const now = () => Math.floor(Date.now() / 1000)

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new HttpError(400, 'Neplatná data požadavku.')
  }
}

export const str = (v: unknown, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/* ───────── nastavení (key → JSON) ───────── */
export async function getSetting<T>(env: Env, key: string): Promise<T | null> {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>()
  if (!row) return null
  try {
    return JSON.parse(row.value) as T
  } catch {
    return null
  }
}

export async function setSetting(env: Env, key: string, value: unknown) {
  await env.DB.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch()) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  ).bind(key, JSON.stringify(value)).run()
}

export async function deleteSetting(env: Env, key: string) {
  await env.DB.prepare('DELETE FROM settings WHERE key = ?').bind(key).run()
}

/* ───────── kryptografie ───────── */
const enc = new TextEncoder()

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomToken(bytes = 32) {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)))
}

export async function sha256(text: string) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}

/** Workers povolují PBKDF2 nejvýše se 100 000 iteracemi. */
const PBKDF2_ITER = 100_000

export async function hashPassword(password: string, salt = randomToken(16), iterations = PBKDF2_ITER) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, key, 256)
  return { hash: b64url(bits), salt, iterations }
}

export function safeEqual(a: string, b: string) {
  const x = enc.encode(a)
  const y = enc.encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

/* ───────── přihlášení majitele ───────── */
export const SESSION_COOKIE = 'sp_admin'
const SESSION_DAYS = 30

export function clientIp(req: Request) {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
}

function readCookie(req: Request, name: string) {
  const raw = req.headers.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

function cookie(name: string, value: string, maxAge: number) {
  // Lax: cookie přežije návrat z přihlášení Googlu; proti CSRF chrání povinná hlavička u změn (viz requireAdmin)
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
}

export async function createSession(env: Env, req: Request) {
  const token = randomToken()
  const t = now()
  await env.DB.prepare('INSERT INTO sessions (token_hash, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), t, t + SESSION_DAYS * 86400, (req.headers.get('user-agent') ?? '').slice(0, 200))
    .run()
  // úklid prošlých relací
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t).run()
  return cookie(SESSION_COOKIE, token, SESSION_DAYS * 86400)
}

export async function destroySession(env: Env, req: Request) {
  const token = readCookie(req, SESSION_COOKIE)
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run()
  return cookie(SESSION_COOKIE, '', 0)
}

export async function isAdmin(env: Env, req: Request) {
  const token = readCookie(req, SESSION_COOKIE)
  if (!token) return false
  const row = await env.DB.prepare('SELECT expires_at FROM sessions WHERE token_hash = ?').bind(await sha256(token)).first<{ expires_at: number }>()
  return !!row && row.expires_at > now()
}

/**
 * Každý požadavek do administrace musí mít platnou relaci.
 * Změny (POST/PUT/PATCH/DELETE) navíc vyžadují hlavičku, kterou cizí web bez CORS poslat nemůže.
 */
export async function requireAdmin(env: Env, req: Request) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers.get('x-requested-with') !== 'spejtek-admin') {
    throw new HttpError(403, 'Chybí ochranná hlavička požadavku.')
  }
  if (!(await isAdmin(env, req))) throw new HttpError(401, 'Přihlaste se prosím znovu.')
}

/* ───────── e-mail (Resend) ───────── */
export async function sendMail(env: Env, to: string, subject: string, text: string, replyTo?: string) {
  if (!env.RESEND_API_KEY || !to) return
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Web Malířství Špejtek <onboarding@resend.dev>',
      to: [to],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })
  if (!res.ok) console.error('Resend', res.status, await res.text())
}
