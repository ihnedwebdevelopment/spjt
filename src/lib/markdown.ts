/**
 * Malý a bezpečný převod textu článku (zjednodušený Markdown) na HTML.
 * Veškerý text se nejdřív escapuje, takže do stránky se nikdy nedostane cizí HTML ani skript.
 *
 * Podporuje: ## nadpis, ### podnadpis, **tučně**, *kurzíva*, [odkaz](https://…), ![popis](/media/…),
 * odrážky (- …), číslované seznamy (1. …), > citát a prázdný řádek jako nový odstavec.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function safeUrl(u: string) {
  const t = u.trim()
  return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(t) ? t : '#'
}

function inline(s: string) {
  let out = esc(s)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy" decoding="async">`)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    const url = safeUrl(href)
    const ext = /^https?:\/\//i.test(url)
    return `<a href="${url}"${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`
  })
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
  return out
}

export function markdownToHtml(src: string): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let para: string[] = []
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null
  const flushPara = () => { if (para.length) { html.push(`<p>${inline(para.join(' '))}</p>`); para = [] } }
  const flushList = () => { if (list) { html.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`); list = null } }

  for (const raw of lines) {
    const line = raw.trim()
    let m: RegExpMatchArray | null
    if (!line) { flushPara(); flushList(); continue }
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      flushPara(); flushList()
      const lvl = m[1].length
      html.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`)
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flushPara()
      if (list?.type !== 'ul') { flushList(); list = { type: 'ul', items: [] } }
      list.items.push(m[1])
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara()
      if (list?.type !== 'ol') { flushList(); list = { type: 'ol', items: [] } }
      list.items.push(m[1])
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara(); flushList()
      html.push(`<blockquote>${inline(m[1])}</blockquote>`)
    } else if (/^!\[[^\]]*\]\([^)]+\)$/.test(line)) {
      flushPara(); flushList()
      html.push(`<figure>${inline(line)}</figure>`)
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara(); flushList()
  return html.join('\n')
}

/** Odhad doby čtení v minutách. */
export const readingMinutes = (src: string) => Math.max(1, Math.round(src.split(/\s+/).filter(Boolean).length / 200))

export const formatDate = (unix: number) =>
  new Date(unix * 1000).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
