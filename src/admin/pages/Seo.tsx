import { useEffect, useMemo, useState } from 'react'
import { api, type GoogleStatus, type Item } from '../api'
import type { Service } from '../../data/services'
import { ErrorBox, I, Loading, PageHead, Sheet, Text, toast, toastError, useLoad } from '../ui'

const SITE = 'https://malirstvi-spejtek.net'

/** Náhled, jak stránka vypadá ve výsledcích Googlu. */
export function SerpPreview({ title, description, path }: { title: string; description: string; path: string }) {
  const t = title.length > 60 ? title.slice(0, 58) + '…' : title
  const d = description.length > 160 ? description.slice(0, 157) + '…' : description
  return (
    <div className="adm-serp" aria-label="Náhled ve vyhledávání">
      <small>malirstvi-spejtek.net{path === '/' ? '' : ' › ' + path.replace(/^\//, '').replace(/\//g, ' › ')}</small>
      <b>{t || 'Titulek stránky'}</b>
      <p>{d || 'Popis stránky…'}</p>
    </div>
  )
}

const PAGES: { path: string; label: string; title: string; description: string }[] = [
  { path: '/', label: 'Úvodní stránka', title: 'Malíř Jihlava a Vysočina | Malířství Špejtek', description: 'Malířské a natěračské práce v Jihlavě a na Vysočině: malování bytů, dekorativní stěrky, fasády. Přebarvěte si stěnu na fotce svého pokoje a pošlete poptávku.' },
  { path: '/kontakt', label: 'Kontakt', title: 'Kontakt a nezávazná poptávka | Malířství Špejtek', description: 'Zavolejte na 602 581 542 nebo pošlete SMS s fotkami místnosti. Nezávazná nabídka zdarma, obvykle do dvou dnů. Jihlava a celá Vysočina.' },
  { path: '/vizualizator', label: 'Vizualizátor', title: 'Vyzkoušejte barvy | Malířství Špejtek', description: '' },
  { path: '/aktuality', label: 'Aktuality', title: 'Aktuality a rady | Malířství Špejtek', description: 'Novinky, rady k malování a ukázky z realizací Malířství Špejtek v Jihlavě a na Vysočině.' },
]

type SeoMap = Record<string, { title?: string; description?: string }>

export default function Seo() {
  const settings = useLoad<{ pageSeo: SeoMap }>('admin/settings')
  const services = useLoad<Item<Service>[]>('admin/items/services')
  const google = useLoad<GoogleStatus>('admin/google/status')
  const [map, setMap] = useState<SeoMap>({})
  const [edit, setEdit] = useState<(typeof PAGES)[number] | null>(null)
  const [inspect, setInspect] = useState<string | null>(null)
  useEffect(() => { if (settings.data) setMap(settings.data.pageSeo ?? {}) }, [settings.data])

  const save = async (next: SeoMap) => {
    try { await api('admin/settings', { method: 'PUT', body: { pageSeo: next } }); setMap(next); toast('Uloženo'); setEdit(null) } catch (e) { toastError(e) }
  }
  const canInspect = !!(google.data?.connected && google.data.gscSite)

  return (
    <div className="adm-page">
      <PageHead title="SEO stránek" back="/admin/obsah" sub="Titulek a popis, které Google ukazuje ve výsledcích" />
      {settings.loading && <Loading />}
      {settings.error && <ErrorBox error={settings.error} retry={settings.reload} />}
      {settings.data && (
        <ul className="adm-seo-list">
          {PAGES.map((p) => {
            const o = map[p.path]
            return (
              <li key={p.path} className="adm-card">
                <div className="adm-card-head">
                  <h2>{p.label}{o && <span className="adm-tag inline">upraveno</span>}</h2>
                  <div className="adm-inline-actions">
                    {canInspect && <button className="adm-btn ghost small" onClick={() => setInspect(SITE + p.path)}><I n="search" s={16} />Indexace</button>}
                    <button className="adm-btn ghost small" onClick={() => setEdit(p)}>Upravit</button>
                  </div>
                </div>
                <SerpPreview title={o?.title || p.title} description={o?.description || p.description} path={p.path} />
              </li>
            )
          })}
        </ul>
      )}
      <section className="adm-card">
        <div className="adm-card-head"><h2>Stránky služeb</h2></div>
        <p className="adm-hint">Titulky a popisy služeb se upravují přímo u služby.</p>
        <ul className="adm-rows">
          {services.data?.map((s) => (
            <li key={s.id} className="adm-row">
              <span className="adm-row-main"><b>{s.data.seoTitle || s.data.title}</b><small>/{s.data.slug}</small></span>
              {canInspect && <button className="adm-btn ghost small" onClick={() => setInspect(SITE + '/' + s.data.slug)}>Indexace</button>}
            </li>
          ))}
        </ul>
      </section>
      {edit && <EditSeo page={edit} value={map[edit.path] ?? {}} onClose={() => setEdit(null)}
        onSave={(v) => { const next = { ...map }; if (v.title || v.description) next[edit.path] = v; else delete next[edit.path]; save(next) }} />}
      {inspect && <Inspect url={inspect} onClose={() => setInspect(null)} />}
    </div>
  )
}

function EditSeo({ page, value, onClose, onSave }: { page: (typeof PAGES)[number]; value: { title?: string; description?: string }; onClose: () => void; onSave: (v: { title: string; description: string }) => void }) {
  const [title, setTitle] = useState(value.title ?? '')
  const [description, setDescription] = useState(value.description ?? '')
  return (
    <Sheet open onClose={onClose} title={'SEO: ' + page.label}
      footer={<>
        <button className="adm-btn ghost" onClick={() => onSave({ title: '', description: '' })}>Vrátit výchozí</button>
        <button className="adm-btn grow" onClick={() => onSave({ title, description })}>Uložit</button>
      </>}>
      <Text label="Titulek" value={title} onChange={setTitle} placeholder={page.title} max={60} hint="Ideálně do 60 znaků, hlavní slovo na začátek (např. „Malíř Jihlava“)." />
      <Text label="Popis" value={description} onChange={setDescription} placeholder={page.description} multiline rows={4} max={160} hint="Do 160 znaků. Má nalákat ke kliknutí – co dostanu a proč právě vy." />
      <SerpPreview title={title || page.title} description={description || page.description} path={page.path} />
    </Sheet>
  )
}

const VERDICT: Record<string, string> = { PASS: 'V pořádku', PARTIAL: 'Částečně', FAIL: 'Problém', NEUTRAL: 'Nezaindexováno', VERDICT_UNSPECIFIED: 'Neznámé' }

export function Inspect({ url, onClose }: { url: string; onClose: () => void }) {
  const [res, setRes] = useState<{ inspectionResultLink?: string; indexStatusResult?: Record<string, string> } | null>(null)
  const [err, setErr] = useState<Error | null>(null)
  useEffect(() => {
    api<typeof res>('admin/gsc/inspect', { body: { url } }).then(setRes).catch(setErr)
  }, [url])
  const s = res?.indexStatusResult
  const rows = useMemo(() => s ? [
    ['Výsledek', VERDICT[s.verdict] ?? s.verdict],
    ['Stav', s.coverageState],
    ['Poslední procházení', s.lastCrawlTime ? new Date(s.lastCrawlTime).toLocaleString('cs-CZ') : '—'],
    ['Kanonická adresa (Google)', s.googleCanonical ?? '—'],
    ['Robots.txt', s.robotsTxtState],
    ['Indexování povoleno', s.indexingState],
  ] : [], [s])
  return (
    <Sheet open onClose={onClose} title="Kontrola indexace">
      <p className="adm-hint"><code>{url}</code></p>
      {!res && !err && <Loading label="Ptám se Googlu…" />}
      {err && <ErrorBox error={err} />}
      {s && (
        <>
          <dl className="adm-dl">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {res?.inspectionResultLink && <a className="adm-btn ghost" href={res.inspectionResultLink} target="_blank" rel="noopener"><I n="external" s={18} />Otevřít v Search Console</a>}
          <p className="adm-hint">Novou nebo upravenou stránku můžete v Search Console poslat k indexaci tlačítkem „Požádat o indexování“.</p>
        </>
      )}
    </Sheet>
  )
}
