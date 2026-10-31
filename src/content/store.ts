/**
 * Obsah webu, který lze měnit v administraci.
 * Web se vykreslí okamžitě se statickými daty (nebo s poslední uloženou verzí z prohlížeče)
 * a jakmile dorazí /api/content, nahradí je aktuálním obsahem. Když API neodpoví, zůstanou statická data.
 */
import { create } from 'zustand'
import { BUSINESS } from '../config'
import { FAQS, SERVICES, type Service } from '../data/services'
import { REALIZACE, type Realizace } from '../data/realizace'

export interface PostSummary {
  slug: string
  title: string
  excerpt: string
  cover: string | null
  publishedAt: number
}

export interface Review {
  id: number
  name: string
  place: string
  service: string
  rating: number
  text: string
  /** veřejná odpověď majitele */
  reply: string
  date: number
}

export type Business = typeof BUSINESS

interface ApiContent {
  realizace?: Realizace[]
  services?: Service[]
  faqs?: { q: string; a: string }[]
  posts?: PostSummary[]
  business?: Partial<Business>
  pageSeo?: Record<string, { title?: string; description?: string }>
  reviews?: Review[]
}

export interface ContentState {
  business: Business
  services: Service[]
  realizace: Realizace[]
  faqs: [string, string][]
  posts: PostSummary[]
  pageSeo: Record<string, { title?: string; description?: string }>
  reviews: Review[]
  /** obsah dorazil ze serveru */
  live: boolean
}

const CACHE_KEY = 'spejtek-content-v1'
const DEFAULTS: ContentState = {
  business: { ...BUSINESS },
  services: SERVICES,
  realizace: REALIZACE,
  faqs: FAQS,
  posts: [],
  pageSeo: {},
  reviews: [],
  live: false,
}

function merge(api: ApiContent): Partial<ContentState> {
  const business = { ...BUSINESS }
  for (const [k, v] of Object.entries(api.business ?? {})) if (v) (business as Record<string, unknown>)[k] = v
  // aby i místa mimo React (export obrázku, SMS) používala aktuální údaje
  Object.assign(BUSINESS, business)
  return {
    business,
    services: api.services?.length ? api.services.map((s) => ({ ...s, details: s.details ?? [], kinds: s.kinds ?? [] })) : SERVICES,
    realizace: api.realizace?.length ? api.realizace : REALIZACE,
    faqs: api.faqs?.length ? api.faqs.map((f) => [f.q, f.a] as [string, string]) : FAQS,
    posts: api.posts ?? [],
    pageSeo: api.pageSeo ?? {},
    reviews: api.reviews ?? [],
  }
}

function initial(): ContentState {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return { ...DEFAULTS, ...merge(JSON.parse(raw) as ApiContent) }
  } catch { /* bez úložiště – nevadí */ }
  return DEFAULTS
}

export const useContent = create<ContentState>(() => initial())

let loading: Promise<void> | null = null

export function loadContent(force = false) {
  if (loading && !force) return loading
  loading = (async () => {
    try {
      const res = await fetch('/api/content', { headers: { accept: 'application/json' } })
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return
      const api = (await res.json()) as ApiContent
      useContent.setState({ ...merge(api), live: true })
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(api)) } catch { /* plné úložiště */ }
    } catch { /* offline nebo statický hosting bez API – zůstanou výchozí data */ }
  })()
  return loading
}

export const useBusiness = () => useContent((s) => s.business)
