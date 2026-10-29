import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type GscReport, type Metric, fmtNum, fmtPct } from '../api'
import { Delta, ErrorBox, I, LineChart, Loading, PageHead, RangePicker, Stat, toast, toastError, useLoad } from '../ui'
import { Inspect } from './Seo'

type Key = 'clicks' | 'impressions' | 'ctr' | 'position'
const METRICS: { key: Key; label: string; fmt: (n: number) => string; invert?: boolean }[] = [
  { key: 'clicks', label: 'Kliknutí', fmt: (n) => fmtNum(n) },
  { key: 'impressions', label: 'Zobrazení', fmt: (n) => fmtNum(n) },
  { key: 'ctr', label: 'Míra prokliku', fmt: fmtPct },
  { key: 'position', label: 'Průměrná pozice', fmt: (n) => fmtNum(n, 1), invert: true },
]
interface Sitemap { path: string; lastSubmitted?: string; lastDownloaded?: string; isPending?: boolean; errors?: string; warnings?: string; contents?: { submitted?: string; indexed?: string }[] }

export default function SearchConsole() {
  const [days, setDays] = useState(28)
  const [metric, setMetric] = useState<Key>('clicks')
  const [tab, setTab] = useState<'queries' | 'pages'>('queries')
  const [inspect, setInspect] = useState<string | null>(null)
  const r = useLoad<GscReport>(`admin/gsc/report?days=${days}`, [days])
  const d = r.data
  const m = METRICS.find((x) => x.key === metric)!
  const rows: Metric[] = d ? (tab === 'queries' ? d.queries : d.pages) : []

  return (
    <div className="adm-page">
      <PageHead title="Search Console" back="/admin/google" sub={d ? `${d.site.replace('sc-domain:', '')} · ${new Date(d.range.start).toLocaleDateString('cs-CZ')} – ${new Date(d.range.end).toLocaleDateString('cs-CZ')}` : 'Jak vás lidé nacházejí na Googlu'}>
        <RangePicker value={days} onChange={setDays} />
      </PageHead>
      {r.loading && !d && <Loading label="Načítám data z Googlu…" />}
      {r.error && <ErrorBox error={r.error} retry={r.reload}><Link className="adm-link" to="/admin/google">Nastavení Google</Link></ErrorBox>}
      {d && (
        <>
          <section className="adm-stats four">
            {METRICS.map((x) => (
              <Stat key={x.key} label={x.label} value={x.fmt(d.total[x.key])} onClick={() => setMetric(x.key)} active={metric === x.key}>
                <Delta cur={d.total[x.key]} prev={d.previous[x.key]} invert={x.invert} />
              </Stat>
            ))}
          </section>
          <section className="adm-card">
            <h2 className="adm-chart-title">{m.label} po dnech</h2>
            <LineChart label={m.label} format={m.fmt} points={d.daily.map((p) => ({ key: p.key, value: p[metric] }))} />
            <p className="adm-hint">Data z Googlu mají zpoždění zhruba 2 dny. Porovnání je s předchozími {days} dny.</p>
          </section>

          <section className="adm-card">
            <div className="adm-card-head">
              <div className="adm-seg" role="tablist">
                <button role="tab" aria-pressed={tab === 'queries'} onClick={() => setTab('queries')}>Hledané výrazy</button>
                <button role="tab" aria-pressed={tab === 'pages'} onClick={() => setTab('pages')}>Stránky</button>
              </div>
            </div>
            {!rows.length && <p className="adm-hint">Za toto období žádná data.</p>}
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>{tab === 'queries' ? 'Výraz' : 'Stránka'}</th><th>Kliky</th><th>Zobr.</th><th className="hide-sm">CTR</th><th>Pozice</th></tr></thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.key}>
                      <td className="key">{tab === 'pages'
                        ? <button className="adm-linkbtn" onClick={() => setInspect(x.key)} title="Zkontrolovat indexaci">{x.key.replace(/^https?:\/\/[^/]+/, '') || '/'}</button>
                        : x.key}</td>
                      <td>{fmtNum(x.clicks)}</td><td>{fmtNum(x.impressions)}</td><td className="hide-sm">{fmtPct(x.ctr)}</td><td>{fmtNum(x.position, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tab === 'queries' && <p className="adm-hint">Tip: výrazy na 5.–15. pozici s hodně zobrazeními jsou nejlepší témata pro nový článek nebo doplnění textu služby.</p>}
          </section>

          {d.devices.length > 0 && (
            <section className="adm-card">
              <h2>Zařízení</h2>
              <ul className="adm-bars">
                {d.devices.map((x) => {
                  const total = d.devices.reduce((s, y) => s + y.clicks, 0) || 1
                  const label = { MOBILE: 'Mobil', DESKTOP: 'Počítač', TABLET: 'Tablet' }[x.key] ?? x.key
                  return <li key={x.key}><span>{label}</span><i style={{ width: `${(x.clicks / total) * 100}%` }} /><b>{fmtNum(x.clicks)}</b></li>
                })}
              </ul>
            </section>
          )}
          <Sitemaps />
        </>
      )}
      {inspect && <Inspect url={inspect} onClose={() => setInspect(null)} />}
    </div>
  )
}

function Sitemaps() {
  const s = useLoad<Sitemap[]>('admin/gsc/sitemaps')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try { await api('admin/gsc/sitemaps', { body: {} }); toast('Sitemapa odeslána Googlu'); s.reload() } catch (e) { toastError(e) } finally { setBusy(false) }
  }
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>Sitemapa</h2>
        <button className="adm-btn ghost small" disabled={busy} onClick={submit}><I n="refresh" s={16} />Odeslat znovu</button>
      </div>
      <p className="adm-hint">Sitemapa se generuje automaticky – obsahuje služby i zveřejněné články. Po větší změně ji pošlete Googlu znovu.</p>
      {s.error && <ErrorBox error={s.error} />}
      <ul className="adm-rows">
        {s.data?.map((x) => (
          <li key={x.path} className="adm-row">
            <span className="adm-row-main"><b>{x.path.replace(/^https?:\/\/[^/]+/, '')}</b>
              <small>{x.lastDownloaded ? 'Google stáhl ' + new Date(x.lastDownloaded).toLocaleDateString('cs-CZ') : x.isPending ? 'Čeká na zpracování' : 'Zatím nestaženo'}
                {x.contents?.[0]?.submitted ? ` · ${x.contents[0].submitted} adres` : ''}</small></span>
            {Number(x.errors) > 0 && <span className="adm-pill lost">{x.errors} chyb</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
