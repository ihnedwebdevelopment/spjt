import { Link, useNavigate } from 'react-router-dom'
import { type AdsReport, type GoogleStatus, type GscReport, STATUS, type InquiryStatus, fmtAgo, fmtMoney, fmtNum } from '../api'
import { Delta, ErrorBox, I, Loading, PageHead, Stat, useLoad } from '../ui'

interface Stats {
  inquiries: number; newInquiries: number; inquiriesWeek: number; posts: number; realizace: number
  latest: { id: number; name: string; phone: string; message: string; status: InquiryStatus; created_at: number }[]
}

export default function Dashboard() {
  const nav = useNavigate()
  const stats = useLoad<Stats>('admin/stats')
  const google = useLoad<GoogleStatus>('admin/google/status')
  const g = google.data
  const gscOn = !!(g?.connected && g.gscSite)
  const adsOn = !!(g?.connected && g.adsCustomerId && g.adsDeveloperToken)
  const gsc = useLoad<GscReport>(gscOn ? 'admin/gsc/report?days=28' : null, [gscOn])
  const ads = useLoad<AdsReport>(adsOn ? 'admin/ads/report?days=30' : null, [adsOn])
  const s = stats.data
  const hour = new Date().getHours()

  return (
    <div className="adm-page">
      <PageHead title={hour < 10 ? 'Dobré ráno' : hour < 18 ? 'Dobrý den' : 'Dobrý večer'} sub="Co se děje na webu malirstvi-spejtek.net" />

      <div className="adm-quick">
        <button className="adm-quick-btn" onClick={() => nav('/admin/realizace?nova=1')}><I n="camera" /><span>Přidat realizaci</span></button>
        <button className="adm-quick-btn" onClick={() => nav('/admin/aktuality/novy')}><I n="doc" /><span>Napsat článek</span></button>
        <a className="adm-quick-btn" href="/" target="_blank" rel="noopener"><I n="external" /><span>Otevřít web</span></a>
      </div>

      {stats.error && <ErrorBox error={stats.error} retry={stats.reload} />}
      <section className="adm-stats">
        <Stat label="Nové poptávky" value={s ? fmtNum(s.newInquiries) : '–'} onClick={() => nav('/admin/poptavky')}>
          {s && <small>{s.inquiriesWeek} za posledních 7 dní</small>}
        </Stat>
        <Stat label="Kliknutí z Googlu (28 dní)" value={gsc.data ? fmtNum(gsc.data.total.clicks) : gscOn ? '…' : '–'} onClick={() => nav(gscOn ? '/admin/search-console' : '/admin/google')}>
          {gsc.data ? <Delta cur={gsc.data.total.clicks} prev={gsc.data.previous.clicks} /> : !gscOn && <small>Připojit Search Console</small>}
        </Stat>
        <Stat label="Útrata za reklamy (30 dní)" value={ads.data ? fmtMoney(ads.data.total.cost, ads.data.currency) : adsOn ? '…' : '–'} onClick={() => nav(adsOn ? '/admin/reklamy' : '/admin/google')}>
          {ads.data ? <small>{fmtNum(ads.data.total.clicks)} kliknutí · {fmtNum(ads.data.total.conversions, 0)} konverzí</small> : !adsOn && <small>Připojit Google Ads</small>}
        </Stat>
        <Stat label="Obsah webu" value={s ? `${s.realizace} / ${s.posts}` : '–'} onClick={() => nav('/admin/obsah')}>
          <small>realizací / článků</small>
        </Stat>
      </section>
      {(gsc.error || ads.error) && (
        <p className="adm-hint warn">{gsc.error ? 'Search Console: ' + gsc.error.message : ''} {ads.error ? 'Google Ads: ' + ads.error.message : ''}</p>
      )}

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Poslední poptávky</h2>
          <Link to="/admin/poptavky" className="adm-link">Všechny</Link>
        </div>
        {stats.loading && <Loading />}
        {s && !s.latest.length && <p className="adm-hint">Zatím žádné poptávky. Jakmile někdo odešle formulář na webu, objeví se tady.</p>}
        <ul className="adm-rows">
          {s?.latest.map((q) => (
            <li key={q.id}>
              <Link to={`/admin/poptavky/${q.id}`} className="adm-row">
                <span className={'adm-dot ' + q.status} aria-hidden />
                <span className="adm-row-main">
                  <b>{q.name || q.phone || 'Bez jména'}</b>
                  <small>{q.message.slice(0, 90) || 'Návrh z vizualizátoru'}</small>
                </span>
                <span className="adm-row-side"><small>{fmtAgo(q.created_at)}</small><small>{STATUS[q.status]}</small></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {gsc.data && gsc.data.queries.length > 0 && (
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Co lidé hledají</h2>
            <Link to="/admin/search-console" className="adm-link">Search Console</Link>
          </div>
          <ul className="adm-mini-table">
            {gsc.data.queries.slice(0, 6).map((q) => (
              <li key={q.key}><span>{q.key}</span><b>{fmtNum(q.clicks)}</b><small>{fmtNum(q.position, 1)}. místo</small></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
