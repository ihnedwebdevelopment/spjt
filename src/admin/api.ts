/** Volání API administrace. Změny posílají ochrannou hlavičku (viz worker/lib.ts → requireAdmin). */
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; raw?: BodyInit; type?: string } = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined || opts.raw ? 'POST' : 'GET')
  const headers: Record<string, string> = { 'x-requested-with': 'spejtek-admin', accept: 'application/json' }
  let body: BodyInit | undefined
  if (opts.raw) { body = opts.raw; if (opts.type) headers['content-type'] = opts.type }
  else if (opts.body !== undefined) { body = JSON.stringify(opts.body); headers['content-type'] = 'application/json' }
  let res: Response
  try {
    res = await fetch('/api/' + path.replace(/^\//, ''), { method, headers, body, credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, 'Nepodařilo se spojit se serverem. Jste online?')
  }
  const isJson = (res.headers.get('content-type') ?? '').includes('json')
  const data = isJson ? await res.json().catch(() => ({})) : null
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('admin/login')) onUnauthorized?.()
    if (!isJson) throw new ApiError(res.status, res.status === 404 ? 'API není dostupné. Běží web přes Cloudflare Worker?' : `Chyba serveru (${res.status}).`)
    throw new ApiError(res.status, (data as { error?: string })?.error ?? `Chyba (${res.status}).`)
  }
  return data as T
}

/* ───────── typy ───────── */
export interface Item<D = Record<string, unknown>> { id: string; sort: number; published: boolean; updatedAt: number; data: D }

export interface Inquiry {
  id: number; name: string; phone: string; email: string; message: string; design: string; page: string
  photos: string[]; status: InquiryStatus; note: string; createdAt: number
}
export type InquiryStatus = 'new' | 'contacted' | 'offer' | 'won' | 'lost' | 'archived'
export const STATUS: Record<InquiryStatus, string> = {
  new: 'Nová', contacted: 'Kontaktováno', offer: 'Nabídka odeslána', won: 'Zakázka', lost: 'Nevyšlo', archived: 'Archiv',
}

export interface PostRow {
  id: number; slug: string; title: string; excerpt: string; body?: string; cover: string | null; published: number
  published_at: number | null; updated_at: number; seo_title?: string | null; seo_description?: string | null
}

export interface GoogleStatus {
  oauthConfigured: boolean; adsDeveloperToken: boolean; connected: boolean; email: string; connectedAt: number | null
  hasAdsScope: boolean; gscSite?: string; adsCustomerId?: string; adsLoginCustomerId?: string
}

export interface Metric { key: string; clicks: number; impressions: number; ctr: number; position: number }
export interface GscReport {
  site: string; range: { start: string; end: string; prevStart: string; prevEnd: string }
  total: Omit<Metric, 'key'>; previous: Omit<Metric, 'key'>
  daily: Metric[]; queries: Metric[]; pages: Metric[]; devices: Metric[]
}

export interface AdsMetric { impressions: number; clicks: number; cost: number; conversions: number }
export interface AdsCampaign extends AdsMetric {
  id: string; name: string; status: string; servingStatus: string; channel: string; budgetResource: string; dailyBudget: number
}
export interface AdsReport {
  customerId: string; name: string; currency: string; range: GscReport['range']
  total: AdsMetric; previous: AdsMetric; daily: (AdsMetric & { key: string })[]
  campaigns: AdsCampaign[]; searchTerms: (AdsMetric & { key: string })[]
}

/* ───────── formátování ───────── */
export const fmtNum = (n: number, d = 0) => n.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d })
export const fmtMoney = (n: number, cur = 'CZK') => n.toLocaleString('cs-CZ', { style: 'currency', currency: cur, maximumFractionDigits: n < 100 && n % 1 ? 2 : 0, minimumFractionDigits: 0 })
export const fmtPct = (n: number) => (n * 100).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + ' %'
export const fmtDate = (unix: number) => new Date(unix * 1000).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
export function fmtAgo(unix: number) {
  const s = Date.now() / 1000 - unix
  if (s < 60) return 'právě teď'
  if (s < 3600) return `před ${Math.floor(s / 60)} min`
  if (s < 86400) return `před ${Math.floor(s / 3600)} h`
  if (s < 86400 * 7) { const d = Math.floor(s / 86400); return d === 1 ? 'včera' : `před ${d} dny` }
  return fmtDate(unix)
}
