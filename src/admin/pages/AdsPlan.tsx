import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtMoney, fmtNum } from '../api'
import { I, Stat } from '../ui'
import { PLAN, estimate } from '../adsPlan'

/** Kampaň připravená ke spuštění – ukáže se, dokud není připojený účet Google Ads. */
export default function AdsPlan({ reason }: { reason?: string }) {
  const [group, setGroup] = useState(0)
  const [ad, setAd] = useState(0)
  const e = estimate()
  const g = PLAN.groups[group]
  const h = PLAN.headlines
  const rest = h.filter((x) => x !== g.headline)
  const heads = [g.headline, rest[ad % rest.length], rest[(ad + 1) % rest.length]]
  const desc = PLAN.descriptions[ad % PLAN.descriptions.length]
  const keywords = PLAN.groups.reduce((s, x) => s + x.keywords.length, 0)

  return (
    <>
      <section className="adm-stats four">
        <Stat label={`Rozpočet na ${PLAN.months} měsíců`} value={fmtMoney(PLAN.totalBudget)}><small>{fmtMoney(PLAN.dailyBudget)} denně · {fmtMoney(e.month)} měsíčně</small></Stat>
        <Stat label="Odhad kliknutí / měsíc" value={`${fmtNum(e.clicks[0])}–${fmtNum(e.clicks[1])}`}><small>celkem {fmtNum(e.clicks[0] * PLAN.months)}–{fmtNum(e.clicks[1] * PLAN.months)} za {PLAN.months} měsíců</small></Stat>
        <Stat label="Sestavy reklam" value={fmtNum(PLAN.groups.length)}><small>{keywords} klíčových slov</small></Stat>
        <Stat label="Oblast" value={`${PLAN.cities.length} města`}><small>{PLAN.cities.join(', ')}</small></Stat>
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Kampaně</h2>
          <Link to="/admin/google" className="adm-btn small"><I n="play" s={16} />Spustit</Link>
        </div>
        <ul className="adm-campaigns">
          <li>
            <div className="adm-camp-head">
              <span><b>{PLAN.campaign}</b><small>{PLAN.channel}</small></span>
              <span className="adm-pill archived">Nespuštěno</span>
            </div>
            <dl className="adm-camp-metrics">
              <div><dt>Rozpočet</dt><dd>{fmtMoney(PLAN.totalBudget)} / {PLAN.months} měsíců</dd></div>
              <div><dt>Denně</dt><dd>{fmtMoney(PLAN.dailyBudget)}</dd></div>
              <div><dt>Cílení</dt><dd>{PLAN.location}</dd></div>
              <div><dt>Kdy</dt><dd>{PLAN.schedule}</dd></div>
              <div><dt>Strategie</dt><dd>{PLAN.bidding}</dd></div>
            </dl>
          </li>
        </ul>
        <p className="adm-hint">Konverze: {PLAN.conversions.join(' a ')}. Cena za klik se odhaduje na {PLAN.cpc[0]}–{PLAN.cpc[1]} Kč.</p>
      </section>

      <section className="adm-card">
        <h2>Reklama</h2>
        <div className="adm-chips" role="tablist" aria-label="Sestava reklam">
          {PLAN.groups.map((x, i) => (
            <button key={x.name} role="tab" aria-selected={group === i} onClick={() => setGroup(i)}>{x.name}<span>{x.keywords.length}</span></button>
          ))}
        </div>
        <div className="adm-ad" aria-label="Náhled reklamy ve vyhledávání">
          <small><b>Sponzorováno</b></small>
          <small className="adm-ad-url">malirstvi-spejtek.net › {g.path.join(' › ')}</small>
          <b className="adm-ad-title">{heads.join(' | ')}</b>
          <p>{desc}</p>
          <span className="adm-ad-ext"><I n="phone" s={14} />602 581 542 · Jihlava</span>
        </div>
        <button className="adm-btn ghost small" onClick={() => setAd((x) => x + 1)}><I n="refresh" s={16} />Další varianta textu</button>
        <h3 className="adm-h3">Klíčová slova</h3>
        <ul className="adm-tags">{g.keywords.map((k) => <li key={k}>„{k}“</li>)}</ul>
        <p className="adm-hint">Odkaz vede na <code>{g.url}</code>.</p>
      </section>

      <section className="adm-card">
        <h2>Nadpisy a popisy</h2>
        <p className="adm-hint">Google je skládá do reklam a sám vybírá kombinace, které fungují nejlépe.</p>
        <ul className="adm-assets">
          {PLAN.headlines.map((x) => <li key={x}><span>{x}</span><small>{x.length}/30</small></li>)}
        </ul>
        <ul className="adm-assets">
          {PLAN.descriptions.map((x) => <li key={x}><span>{x}</span><small>{x.length}/90</small></li>)}
        </ul>
      </section>

      <section className="adm-card">
        <h2>Vylučující slova</h2>
        <p className="adm-hint">Na tyto dotazy se reklama nezobrazí – lidé nehledají malíře, ale práci, návody nebo obchod.</p>
        <ul className="adm-tags muted">{PLAN.negatives.map((k) => <li key={k}>−{k}</li>)}</ul>
      </section>

      <p className="adm-hint">{reason ? reason + ' ' : ''}Kampaň se spustí po připojení účtu Google Ads v sekci <Link className="adm-link" to="/admin/google">Google</Link>; pak se tu místo odhadů zobrazí skutečné výsledky.</p>
    </>
  )
}
