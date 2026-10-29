import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api, type AdsCampaign, type AdsReport, fmtMoney, fmtNum } from '../api'
import AdsPlan from './AdsPlan'
import { ConfirmButton, Delta, ErrorBox, I, LineChart, Loading, PageHead, RangePicker, Sheet, Stat, toast, toastError, useLoad } from '../ui'

type Key = 'cost' | 'clicks' | 'impressions' | 'conversions'
const CHANNEL: Record<string, string> = { SEARCH: 'Vyhledávání', PERFORMANCE_MAX: 'Performance Max', DISPLAY: 'Obsahová síť', VIDEO: 'Video', DEMAND_GEN: 'Demand Gen', LOCAL_SERVICES: 'Místní služby', SMART: 'Chytrá kampaň' }

export default function Ads() {
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState<Key>('cost')
  const [budget, setBudget] = useState<AdsCampaign | null>(null)
  const r = useLoad<AdsReport>(`admin/ads/report?days=${days}`, [days])
  const d = r.data
  const cur = d?.currency ?? 'CZK'
  const METRICS: { key: Key; label: string; fmt: (n: number) => string; invert?: boolean }[] = [
    { key: 'cost', label: 'Útrata', fmt: (n) => fmtMoney(n, cur), invert: true },
    { key: 'clicks', label: 'Kliknutí', fmt: (n) => fmtNum(n) },
    { key: 'impressions', label: 'Zobrazení', fmt: (n) => fmtNum(n) },
    { key: 'conversions', label: 'Konverze', fmt: (n) => fmtNum(n, n % 1 ? 1 : 0) },
  ]
  const m = METRICS.find((x) => x.key === metric)!
  const enabled = d?.campaigns.filter((c) => c.status === 'ENABLED') ?? []
  // účet Ads ještě není připojený → ukážeme kampaň připravenou ke spuštění
  const notConnected = r.error instanceof ApiError && r.error.status === 409

  const setStatus = async (c: AdsCampaign, status: 'ENABLED' | 'PAUSED') => {
    try {
      await api(`admin/ads/campaigns/${c.id}`, { body: { status } })
      r.setData((x) => x && { ...x, campaigns: x.campaigns.map((y) => (y.id === c.id ? { ...y, status } : y)) })
      toast(status === 'PAUSED' ? `„${c.name}“ pozastavena` : `„${c.name}“ spuštěna`)
    } catch (e) { toastError(e) }
  }
  const pauseAll = async () => {
    for (const c of enabled) await setStatus(c, 'PAUSED')
  }

  return (
    <div className="adm-page">
      <PageHead title="Google Ads" back="/admin/google" sub={d ? `${d.name || 'Účet ' + d.customerId} · posledních ${days} dní` : notConnected ? 'Vyhledávání Google · Jihlava, Praha, Brno, Pardubice' : 'Výkon placené reklamy'}>
        {!notConnected && <RangePicker value={days} onChange={setDays} options={[7, 30, 90]} />}
      </PageHead>
      {r.loading && !d && <Loading label="Načítám data z Google Ads…" />}
      {notConnected && <AdsPlan />}
      {r.error && !notConnected && <ErrorBox error={r.error} retry={r.reload}><Link className="adm-link" to="/admin/google">Nastavení Google</Link></ErrorBox>}
      {d && (
        <>
          <section className="adm-stats four">
            {METRICS.map((x) => (
              <Stat key={x.key} label={x.label} value={x.fmt(d.total[x.key])} onClick={() => setMetric(x.key)} active={metric === x.key}>
                <Delta cur={d.total[x.key]} prev={d.previous[x.key]} invert={x.invert} />
              </Stat>
            ))}
          </section>
          <p className="adm-kpis">
            <span>Cena za klik <b>{d.total.clicks ? fmtMoney(d.total.cost / d.total.clicks, cur) : '–'}</b></span>
            <span>Cena za konverzi <b>{d.total.conversions ? fmtMoney(d.total.cost / d.total.conversions, cur) : '–'}</b></span>
          </p>
          <section className="adm-card">
            <h2 className="adm-chart-title">{m.label} po dnech</h2>
            <LineChart label={m.label} format={m.fmt} points={d.daily.map((p) => ({ key: p.key, value: p[metric] }))} />
          </section>

          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Kampaně</h2>
              {enabled.length > 0 && (
                <ConfirmButton className="adm-btn ghost small" label={`Pozastavit ${enabled.length}?`} onConfirm={pauseAll}>
                  <I n="pause" s={16} />Mám plno – pozastavit vše
                </ConfirmButton>
              )}
            </div>
            {!d.campaigns.length && <p className="adm-hint">V účtu zatím nejsou žádné kampaně.</p>}
            <ul className="adm-campaigns">
              {d.campaigns.map((c) => {
                const on = c.status === 'ENABLED'
                return (
                  <li key={c.id} className={on ? '' : 'paused'}>
                    <div className="adm-camp-head">
                      <span><b>{c.name}</b><small>{CHANNEL[c.channel] ?? c.channel}{on ? '' : ' · pozastaveno'}</small></span>
                      <label className="adm-switch" aria-label={on ? 'Pozastavit kampaň' : 'Spustit kampaň'}>
                        <input type="checkbox" role="switch" checked={on} onChange={(e) => setStatus(c, e.target.checked ? 'ENABLED' : 'PAUSED')} /><i aria-hidden />
                      </label>
                    </div>
                    <dl className="adm-camp-metrics">
                      <div><dt>Útrata</dt><dd>{fmtMoney(c.cost, cur)}</dd></div>
                      <div><dt>Kliky</dt><dd>{fmtNum(c.clicks)}</dd></div>
                      <div><dt>Konverze</dt><dd>{fmtNum(c.conversions, c.conversions % 1 ? 1 : 0)}</dd></div>
                      <div><dt>Rozpočet / den</dt><dd>
                        {c.budgetResource ? <button className="adm-linkbtn" onClick={() => setBudget(c)}>{fmtMoney(c.dailyBudget, cur)}</button> : '–'}
                      </dd></div>
                    </dl>
                  </li>
                )
              })}
            </ul>
          </section>

          {d.searchTerms.length > 0 && (
            <section className="adm-card">
              <h2>Co lidé hledali, když klikli na reklamu</h2>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Výraz</th><th>Kliky</th><th>Útrata</th><th className="hide-sm">Konverze</th></tr></thead>
                  <tbody>{d.searchTerms.map((t) => (
                    <tr key={t.key}><td className="key">{t.key}</td><td>{fmtNum(t.clicks)}</td><td>{fmtMoney(t.cost, cur)}</td><td className="hide-sm">{fmtNum(t.conversions, 1)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <p className="adm-hint">Výrazy, které s malováním nesouvisí (např. „práce malíř brigáda“), přidejte v Google Ads jako vylučující slova.</p>
            </section>
          )}
          <p className="adm-hint">Podrobnější úpravy (texty reklam, klíčová slova) dělejte v <a href={`https://ads.google.com/aw/overview?__c=${d.customerId}`} target="_blank" rel="noopener">Google Ads</a>.</p>
        </>
      )}
      {budget && <BudgetSheet c={budget} currency={cur} onClose={() => setBudget(null)}
        onSaved={(amount) => { r.setData((x) => x && { ...x, campaigns: x.campaigns.map((y) => (y.budgetResource === budget.budgetResource ? { ...y, dailyBudget: amount } : y)) }); setBudget(null) }} />}
    </div>
  )
}

function BudgetSheet({ c, currency, onClose, onSaved }: { c: AdsCampaign; currency: string; onClose: () => void; onSaved: (n: number) => void }) {
  const [v, setV] = useState(String(Math.round(c.dailyBudget)))
  const [busy, setBusy] = useState(false)
  const n = Number(v.replace(',', '.'))
  const save = async () => {
    setBusy(true)
    try { await api('admin/ads/budget', { body: { resource: c.budgetResource, amount: n } }); toast('Rozpočet změněn'); onSaved(n) } catch (e) { toastError(e) } finally { setBusy(false) }
  }
  return (
    <Sheet open onClose={onClose} title="Denní rozpočet"
      footer={<button className="adm-btn grow" disabled={busy || !(n > 0)} onClick={save}>{busy ? 'Ukládám…' : 'Uložit rozpočet'}</button>}>
      <p><b>{c.name}</b></p>
      <div className="adm-field">
        <label className="adm-label" htmlFor="budget">Částka za den ({currency})</label>
        <input id="budget" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} />
        <p className="adm-hint">Za měsíc to dělá zhruba {n > 0 ? fmtMoney(n * 30.4, currency) : '–'}. Google může v jednotlivé dny utratit až dvojnásobek, za měsíc ale nepřekročí 30,4× denní rozpočet.</p>
      </div>
      <div className="adm-chips wrap">
        {[100, 200, 300, 500].map((x) => <button key={x} type="button" aria-pressed={n === x} onClick={() => setV(String(x))}>{fmtMoney(x, currency)}</button>)}
      </div>
    </Sheet>
  )
}
