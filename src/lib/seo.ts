import { useEffect } from 'react'

const SITE = 'https://malirstvi-spejtek.net'

function setMeta(selector: string, attr: string, value: string, create: () => HTMLElement) {
  let el = document.head.querySelector(selector) as HTMLElement | null
  if (!el) { el = create(); document.head.appendChild(el) }
  el.setAttribute(attr, value)
}

/** Titulek, popis a kanonická adresa stránky (pro vyhledávače a sdílení). */
export function usePageMeta(title: string, description: string, path: string) {
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
