import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { type Review, useContent } from '../content/store'
import Icon from './Icon'

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
        <span key={n} className={value >= n - 0.25 ? 'on' : ''}><Icon name="star" size={size} /></span>
      ))}
    </span>
  )
}

function ReviewCard({ r }: { r: Review }) {
  const [open, setOpen] = useState(false)
  const long = r.text.length > 360
  return (
    <li className="review">
      <Stars value={r.rating} />
      <blockquote className={long && !open ? 'clamp' : ''}>{r.text}</blockquote>
      {long && <button type="button" className="review-more" onClick={() => setOpen((o) => !o)}>{open ? 'Méně' : 'Číst celé'}</button>}
      <footer>
        <b>{r.name}</b>
        <small>{[r.place, r.service, fmtMonth(r.date)].filter(Boolean).join(' · ')}</small>
      </footer>
      {r.reply && (
        <div className="review-reply">
          <small>Odpověď Malířství Špejtek</small>
          <p>{r.reply}</p>
        </div>
      )}
    </li>
  )
}

/** Recenze zákazníků a formulář, kterým je může napsat kdokoli. Zveřejní se po schválení v administraci. */
export default function Reviews({ standalone }: { standalone?: boolean }) {
  const reviews = useContent((s) => s.reviews)
  const live = useContent((s) => s.live)
  const { hash } = useLocation()
  const [writing, setWriting] = useState(!!standalone || hash === '#napsat-recenzi')
  const [shown, setShown] = useState(PAGE)
  const count = reviews.length
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0

  useEffect(() => { if (hash === '#napsat-recenzi') setWriting(true) }, [hash])

  // dokud nedorazí obsah ze serveru a nic není v mezipaměti, sekci na úvodu neukazujeme naprázdno
  if (!standalone && !live && !count) return null

  return (
    <section className={'section' + (standalone ? ' page-top' : '')} id="recenze">
      <div className="wrap">
        <header className="section-head">
          <div>
            {standalone ? <h1>Recenze zákazníků</h1> : <h2>Co říkají zákazníci</h2>}
            {count > 0 && (
              <p className="reviews-score">
                <b>{fmtRating(avg)}</b>
                <Stars value={avg} size={22} />
                <span>{plural(count)}</span>
              </p>
            )}
          </div>
          <div className="reviews-cta">
            <p className="lead">
              {count ? 'Psali je lidé, u kterých jsem maloval. Každou recenzi si přečtu a na každou se dá odpovědět.' : 'Maloval jsem u vás? Budu rád, když napíšete pár slov – pomůžete tím dalším lidem s výběrem.'}
            </p>
            {!writing && (
              <button className="btn" type="button" onClick={() => setWriting(true)}><Icon name="star" size={18} />Napsat recenzi</button>
            )}
          </div>
        </header>

        {writing && <ReviewForm onClose={standalone ? undefined : () => setWriting(false)} />}

        {count > 0 && (
          <>
            <ul className="reviews">
              {reviews.slice(0, shown).map((r) => <ReviewCard key={r.id} r={r} />)}
            </ul>
            {count > shown && (
              <p className="reviews-more">
                <button className="btn ghost" type="button" onClick={() => setShown((n) => n + PAGE * 2)}>Zobrazit další recenze ({count - shown})</button>
              </p>
            )}
          </>
        )}
        {!standalone && count > PAGE && (
          <p className="reviews-link"><Link to="/recenze">Všechny recenze</Link></p>
        )}
      </div>
    </section>
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
