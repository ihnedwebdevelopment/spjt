import { useEffect } from 'react'
import { useContent } from '../content/store'

const SITE = 'https://malirstvi-spejtek.net'

function setMeta(selector: string, attr: string, value: string, create: () => HTMLElement) {
  let el = document.head.querySelector(selector) as HTMLElement | null
  if (!el) { el = create(); document.head.appendChild(el) }
  el.setAttribute(attr, value)
}

/** Titulek, popis a kanonická adresa stránky (pro vyhledávače a sdílení). */
export function usePageMeta(defTitle: string, defDescription: string, path: string) {
  // titulek a popis lze přepsat v administraci (SEO stránek)
  const o = useContent((s) => s.pageSeo[path])
  const title = o?.title || defTitle
  const description = o?.description || defDescription
  useEffect(() => {
    document.title = title
    const mk = (tag: string, a: Record<string, string>) => () => { const e = document.createElement(tag); for (const k in a) e.setAttribute(k, a[k]); return e }
    setMeta('meta[name="description"]', 'content', description, mk('meta', { name: 'description' }))
    setMeta('meta[property="og:title"]', 'content', title, mk('meta', { property: 'og:title' }))
    setMeta('meta[property="og:description"]', 'content', description, mk('meta', { property: 'og:description' }))
    setMeta('meta[property="og:url"]', 'content', SITE + path, mk('meta', { property: 'og:url' }))
    setMeta('link[rel="canonical"]', 'href', SITE + path, mk('link', { rel: 'canonical' }))
  }, [title, description, path])
}
