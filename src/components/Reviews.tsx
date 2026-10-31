import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { type Review, useContent } from '../content/store'
import Icon from './Icon'
import Reveal from './Reveal'

const LABELS = ['', 'Nespokojen/a', 'Nic moc', 'V pořádku', 'Spokojen/a', 'Naprosto spokojen/a']
const PAGE = 6

const fmtRating = (n: number) => n.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const fmtMonth = (unix: number) => new Date(unix * 1000).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })
function plural(n: number) {
  if (n === 1) return '1 recenze'
  if (n >= 2 && n <= 4) return `${n} recenze`
  return `${n} recenzí`
}

export function Stars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <span className="stars" role="img" aria-label={`${fmtRating(value).replace(',0', '')} z 5 hvězdiček`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={value >= n - 0.05 ? 'on' : ''}>
          <Icon name="star" size={size} />
          {value > n - 1 && value < n - 0.05 && (
            <span className="star-part" style={{ width: `${Math.max(0.15, value - (n - 1)) * 100}%` }}><Icon name="star" size={size} /></span>
          )}
        </span>
      ))}
    </span>
  )
}

/** Barevný kroužek s iniciálami – odstín podle jména, ať se karty od sebe liší. */
const AVATAR_COLORS = ['#2457ff', '#0f8f6f', '#c2571a', '#8a4fd8', '#d1386b', '#1f7fb8', '#7a8a1f', '#b8862a']
function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const initials = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return <span className="review-avatar" style={{ background: AVATAR_COLORS[h % AVATAR_COLORS.length] }} aria-hidden>{initials}</span>
}

export function useReviewStats() {
  const reviews = useContent((s) => s.reviews)
  const count = reviews.length
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0
  return { reviews, count, avg, fmtAvg: fmtRating(avg), label: plural(count) }
}

export function ReviewCard({ r, featured }: { r: Review; featured?: boolean }) {
  const [open, setOpen] = useState(false)
  const long = !featured && r.text.length > 320
  return (
    <li className={'review' + (featured ? ' featured' : '')}>
      <span className="review-quote" aria-hidden><Icon name="quote" size={featured ? 44 : 30} stroke={1.4} /></span>
      <Stars value={r.rating} size={featured ? 22 : 18} />
      <blockquote className={long && !open ? 'clamp' : ''}>{r.text}</blockquote>
      {long && <button type="button" className="review-more" onClick={() => setOpen((o) => !o)}>{open ? 'Méně' : 'Číst celé'}</button>}
      <footer>
        <Avatar name={r.name} />
        <span>
          <b>{r.name}</b>
          <small>{[r.place, r.service, fmtMonth(r.date)].filter(Boolean).join(' · ')}</small>
        </span>
      </footer>
      {r.reply && (
        <div className="review-reply">
          <small><Icon name="check" size={14} />Odpověď Malířství Špejtek</small>
          <p>{r.reply}</p>
        </div>
      )}
    </li>
  )
}

/** Tmavý panel s průměrem, rozložením hvězdiček a tlačítkem. */
function Summary({ reviews, avg, count, onWrite, writing }: { reviews: Review[]; avg: number; count: number; onWrite: () => void; writing: boolean }) {
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }))
  return (
    <aside className="reviews-summary">
      {count > 0 ? (
        <>
          <p className="reviews-avg"><b>{fmtRating(avg)}</b><span>z 5</span></p>
          <Stars value={avg} size={24} />
          <p className="reviews-count">{plural(count)} od zákazníků</p>
          <ul className="reviews-dist" aria-label="Rozložení hodnocení">
            {dist.map(({ n, c }) => (
              <li key={n}>
                <span>{n}<Icon name="star" size={12} /></span>
                <i><em style={{ width: `${count ? (c / count) * 100 : 0}%` }} /></i>
                <small>{c}</small>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <span className="reviews-empty-icon"><Icon name="star" size={30} /></span>
          <p className="reviews-avg-empty">Buďte první, kdo napíše recenzi</p>
        </>
      )}
      <p className="reviews-summary-note">Recenze píšou sami zákazníci. Před zveřejněním je jen kontroluji, neupravuji.</p>
      {!writing && <button className="btn light" type="button" onClick={onWrite}><Icon name="star" size={18} />Napsat recenzi</button>}
    </aside>
  )
}

/** Recenze zákazníků a formulář, kterým je může napsat kdokoli. Zveřejní se po schválení v administraci. */
export default function Reviews({ standalone }: { standalone?: boolean }) {
  const { reviews, count, avg } = useReviewStats()
  const live = useContent((s) => s.live)
  const { hash } = useLocation()
  const [writing, setWriting] = useState(!!standalone || hash === '#napsat-recenzi')
  const [shown, setShown] = useState(standalone ? 12 : PAGE)

  useEffect(() => { if (hash === '#napsat-recenzi') setWriting(true) }, [hash])

  // dokud nedorazí obsah ze serveru a nic není v mezipaměti, sekci na úvodu neukazujeme naprázdno
  if (!standalone && !live && !count) return null

  // zvýrazněná: nejnovější pětihvězdičková s delším textem
  const featured = reviews.find((r) => r.rating === 5 && r.text.length >= 80) ?? null
  const rest = reviews.filter((r) => r !== featured)

  return (
    <section className={'section reviews-section' + (standalone ? ' page-top' : '')} id="recenze">
      <div className="wrap">
        <header className="reviews-head">
          {standalone ? <h1>Recenze zákazníků</h1> : <h2>Co říkají zákazníci</h2>}
          <p className="lead">
            {count ? 'Psali je lidé, u kterých jsem maloval – byty, domy, stěrky i fasády po Vysočině.' : 'Maloval jsem u vás? Budu rád, když napíšete pár slov – pomůžete tím dalším lidem s výběrem.'}
          </p>
        </header>

        <div className="reviews-layout">
          <Reveal className="reviews-side">
            <Summary reviews={reviews} avg={avg} count={count} writing={writing} onWrite={() => setWriting(true)} />
          </Reveal>

          <div className="reviews-main">
            {writing && <ReviewForm onClose={standalone ? undefined : () => setWriting(false)} />}
            {featured && <ul className="reviews-featured"><ReviewCard r={featured} featured /></ul>}
            {rest.length > 0 && (
              <ul className={'reviews' + (standalone ? '' : ' carousel')}>
                {rest.slice(0, shown).map((r) => <ReviewCard key={r.id} r={r} />)}
              </ul>
            )}
            {rest.length > shown && (
              standalone
                ? <p className="reviews-more"><button className="btn ghost" type="button" onClick={() => setShown((n) => n + 12)}>Zobrazit další ({rest.length - shown})</button></p>
                : <p className="reviews-more"><Link className="btn ghost" to="/recenze">Všechny recenze ({count})</Link></p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Krátký pruh recenzí k jedné službě (na stránce služby). */
export function ServiceReviews({ service }: { service: string }) {
  const { reviews } = useReviewStats()
  const list = reviews.filter((r) => r.service === service).slice(0, 3)
  if (!list.length) return null
  return (
    <section className="section reviews-section">
      <div className="wrap">
        <header className="section-head">
          <h2>Co říkají zákazníci</h2>
          <p className="lead">Recenze od lidí, pro které jsem dělal {service.toLowerCase()}. <Link to="/recenze" className="text-link">Všechny recenze</Link></p>
        </header>
        <ul className="reviews carousel">{list.map((r) => <ReviewCard key={r.id} r={r} />)}</ul>
      </div>
    </section>
  )
}

/** Odznak s hodnocením (úvod pod hlavním nadpisem) – zobrazí se od 3 recenzí. */
export function RatingBadge() {
  const { count, avg, fmtAvg, label } = useReviewStats()
  if (count < 3) return null
  return (
    <Link to="/#recenze" className="rating-badge" aria-label={`Hodnocení ${fmtAvg} z 5, ${label}`}>
      <Stars value={avg} size={16} /><b>{fmtAvg}</b><span>{label}</span>
    </Link>
  )
}

function ReviewForm({ onClose }: { onClose?: () => void }) {
  const services = useContent((s) => s.services)
  const uid = useId()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [service, setService] = useState('')
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [trap, setTrap] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (sent) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [sent])

  const submit = async () => {
    setError(null)
    if (!rating) { setError('Vyberte prosím počet hvězdiček.'); return }
    if (name.trim().length < 2) { setError('Napište prosím své jméno (stačí křestní a první písmeno příjmení).'); return }
    if (text.trim().length < 10) { setError('Napište prosím aspoň jednu větu o tom, jak jste byli spokojeni.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ rating, name, place, service, text, email, website: trap }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Odeslání se nepovedlo.')
      setSent(true)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Odeslání se nepovedlo. Zkuste to prosím znovu.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="form form-sent review-form" role="status" ref={ref}>
        <span className="form-sent-icon"><Icon name="check" size={28} /></span>
        <h3>Děkuji za recenzi!</h3>
        <p>Na webu se objeví, jakmile ji zkontroluji – obvykle do pár dní.</p>
        {onClose && <button className="btn ghost" type="button" onClick={onClose}>Zavřít</button>}
      </div>
    )
  }

  const shownRating = hover || rating
  return (
    <div ref={ref} id="napsat-recenzi">
      <form className="form review-form" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
        <fieldset className="field rate" onMouseLeave={() => setHover(0)}>
          <legend className="label">Jak jste byli spokojeni?</legend>
          <div className="rate-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={shownRating >= n ? 'on' : ''} onMouseEnter={() => setHover(n)}>
                <input type="radio" name={uid + '-rating'} value={n} checked={rating === n} onChange={() => setRating(n)} />
                <Icon name="star" size={34} stroke={1.4} />
                <span className="sr">{n} {n === 1 ? 'hvězdička' : n < 5 ? 'hvězdičky' : 'hvězdiček'}</span>
              </label>
            ))}
            <span className="rate-label" aria-hidden>{LABELS[shownRating]}</span>
          </div>
        </fieldset>
        <div className="field-row">
          <div className="field">
            <label htmlFor={uid + '-name'}>Jméno</label>
            <input id={uid + '-name'} autoComplete="name" placeholder="Např. Jana N." maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={uid + '-place'}>Obec <small>(nepovinné)</small></label>
            <input id={uid + '-place'} autoComplete="address-level2" placeholder="Např. Jihlava" maxLength={80} value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={uid + '-svc'}>Co jsem pro vás dělal <small>(nepovinné)</small></label>
          <select id={uid + '-svc'} value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Vyberte…</option>
            {services.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
            <option value="Jiné">Něco jiného</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={uid + '-text'}>Vaše recenze</label>
          <textarea id={uid + '-text'} maxLength={2000} placeholder="Jak probíhala domluva, příprava, úklid, jak jste spokojeni s výsledkem…" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={uid + '-email'}>E-mail <small>(nepovinné, nezveřejní se)</small></label>
          <input id={uid + '-email'} type="email" inputMode="email" autoComplete="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field hp" aria-hidden>
          <label htmlFor={uid + '-web'}>Web</label>
          <input id={uid + '-web'} tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Odesílám…' : 'Odeslat recenzi'}</button>
          {onClose && <button className="btn ghost" type="button" onClick={onClose}>Zrušit</button>}
        </div>
        <p className="form-note">Zveřejní se jméno, obec, hodnocení a text. Recenzi před zveřejněním zkontroluji; e-mail slouží jen k případnému doptání.</p>
      </form>
    </div>
  )
}
