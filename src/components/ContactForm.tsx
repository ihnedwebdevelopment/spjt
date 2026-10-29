import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { BUSINESS } from '../config'
import { allRooms, useDesigner } from '../store/designer'
import { estimate, fmt } from '../lib/geometry'
import { shareUrl } from '../lib/urlState'
import { compressImage } from '../lib/image'
import Icon from './Icon'

const MAX_PHOTOS = 6

export default function ContactForm() {
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const design = useDesigner((s) => s.design)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [trap, setTrap] = useState('')
  const [photos, setPhotos] = useState<{ blob: Blob; url: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sentRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (sent) sentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [sent])
  const photoSummary = useDesigner((s) => s.photoSummary)
  const fromPhoto = params.get('navrh') === 'foto' && !!photoSummary
  const [withDesign, setWithDesign] = useState(params.get('navrh') === '1' || fromPhoto)
  const [done, setDone] = useState<string | null>(null)

  const roomList = useDesigner((s) => s.rooms)
  const activeRoom = useDesigner((s) => s.activeRoom)
  const rooms = useMemo(() => allRooms({ rooms: roomList, activeRoom, design }), [roomList, activeRoom, design])
  const { lines } = estimate(design)
  const totalArea = rooms.reduce((s, r) => s + estimate(r.design).totalArea, 0)
  const designText = () => {
    if (fromPhoto) return `Návrh z mé fotky: ${photoSummary}.`
    const SIDE = { wallN: 'sever', wallE: 'východ', wallS: 'jih', wallW: 'západ', ceiling: 'strop', trim: 'sokl' } as const
    const one = (name: string, d: typeof design) => {
      const e = estimate(d)
      const walls = e.lines.map((l) => `${l.label} (${l.surfaces.map((x) => SIDE[x]).join(', ')})`).join('; ')
      return `${name} ${fmt(d.room.w)}×${fmt(d.room.d)}×${fmt(d.room.h)} m, ${fmt(e.totalArea, 0)} m²: ${walls}`
    }
    return `Návrh z 3D vizualizátoru (${rooms.length === 1 ? '1 místnost' : rooms.length + (rooms.length < 5 ? ' místnosti' : ' místností')}, celkem ${fmt(totalArea, 0)} m² k natření):\n` +
      rooms.map((r) => '• ' + one(r.name, r.design)).join('\n') + '\n' + shareUrl(design)
  }
  const body = () =>
    [`Dobrý den, tady ${name || '…'}${phone ? ' (' + phone + ')' : ''}.`, msg.trim(), withDesign ? designText() : ''].filter(Boolean).join('\n')

  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    setError(null)
    const room = MAX_PHOTOS - photos.length
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room)
    try {
      const out = await Promise.all(picked.map(async (f) => {
        const c = await compressImage(f, 1600, 0.8)
        return { blob: c.blob, url: URL.createObjectURL(c.blob) }
      }))
      setPhotos((p) => [...p, ...out])
    } catch {
      setError('Některou fotku se nepodařilo načíst. Zkuste jinou.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  const removePhoto = (i: number) => setPhotos((p) => { URL.revokeObjectURL(p[i].url); return p.filter((_, n) => n !== i) })

  const submit = async () => {
    setError(null)
    if (!phone.trim() && !email.trim()) { setError('Vyplňte prosím telefon nebo e-mail, ať se vám můžu ozvat.'); return }
    if (!msg.trim() && !withDesign) { setError('Napište prosím pár slov o tom, co potřebujete.'); return }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('name', name); fd.set('phone', phone); fd.set('email', email); fd.set('message', msg)
      fd.set('design', withDesign ? designText() : ''); fd.set('page', pathname); fd.set('website', trap)
      photos.forEach((p, i) => fd.append('photos', p.blob, `foto-${i + 1}.${p.blob.type === 'image/webp' ? 'webp' : 'jpg'}`))
      const res = await fetch('/api/inquiry', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Odeslání se nepovedlo.')
      setSent(true)
      photos.forEach((p) => URL.revokeObjectURL(p.url))
      setPhotos([])
    } catch (e) {
      setError((e instanceof Error && e.message ? e.message : 'Odeslání se nepovedlo.') + ' Můžete zprávu poslat jako SMS nebo zavolat.')
    } finally {
      setBusy(false)
    }
  }

  const sms = () => {
    window.location.href = `sms:${BUSINESS.phoneTel}?&body=${encodeURIComponent(body())}`
    setDone('Otevírám zprávy ve vašem telefonu. Ještě přiložte fotky místnosti, ať vidím podklad.')
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body())
      setDone('Zpráva je zkopírovaná včetně návrhu. Vložte ji do e-mailu nebo zprávy.')
    } catch {
      setDone('Kopírování se nepodařilo, zavolejte prosím na ' + BUSINESS.phoneDisplay + '.')
    }
  }

  if (sent) {
    return (
      <div className="form form-sent" role="status" ref={sentRef}>
        <span className="form-sent-icon"><Icon name="check" size={28} /></span>
        <h3>Děkuji, poptávka dorazila.</h3>
        <p>Ozvu se vám obvykle do dvou dnů{phone ? ` na ${phone}` : email ? ` na ${email}` : ''}. Když spěcháte, zavolejte na <a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a>.</p>
        <button className="btn ghost" type="button" onClick={() => { setSent(false); setMsg('') }}>Poslat další poptávku</button>
      </div>
    )
  }

  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
      <div className="field">
        <label htmlFor="c-name">Jméno</label>
        <input id="c-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="c-phone">Telefon</label>
          <input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="c-email">E-mail <small>(nepovinné)</small></label>
          <input id="c-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-msg">Co potřebujete vymalovat?</label>
        <textarea id="c-msg" placeholder="Např. obývák 25 m², stěny a strop, termín v listopadu…" value={msg} onChange={(e) => setMsg(e.target.value)} />
      </div>
      <div className="field hp" aria-hidden>
        <label htmlFor="c-web">Web</label>
        <input id="c-web" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </div>
      <div className="field">
        <span className="label">Fotky místnosti <small>(nepovinné, max. {MAX_PHOTOS})</small></span>
        <div className="photo-pick">
          {photos.map((p, i) => (
            <figure key={p.url}>
              <img src={p.url} alt={`Fotka ${i + 1}`} />
              <button type="button" aria-label={`Odebrat fotku ${i + 1}`} onClick={() => removePhoto(i)}><Icon name="trash" size={16} /></button>
            </figure>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="photo-add">
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} />
              <Icon name="camera" size={22} /><span>Přidat fotky</span>
            </label>
          )}
        </div>
      </div>
      <label className="attach">
        <input type="checkbox" checked={withDesign} onChange={(e) => setWithDesign(e.target.checked)} />
        <span>{fromPhoto
          ? <>Přiložit můj návrh z fotky ({photoSummary!.split(';').length} {photoSummary!.split(';').length === 1 ? 'plocha' : 'plochy'}). Upravenou fotku můžete přidat výše.</>
          : <>Přiložit můj návrh z 3D vizualizátoru ({rooms.length > 1 ? `${rooms.length} ${rooms.length < 5 ? 'místnosti' : 'místností'}, ` : ''}{fmt(totalArea, 0)} m², {lines.length} {lines.length === 1 ? 'odstín' : lines.length < 5 ? 'odstíny' : 'odstínů'})</>}</span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Odesílám…' : 'Odeslat poptávku'}</button>
        <button className="btn ghost" type="button" onClick={sms}>Poslat jako SMS</button>
        <button className="btn ghost small" type="button" onClick={copy}>Zkopírovat zprávu</button>
      </div>
      {done && <p className="form-note" role="status">{done}</p>}
      <p className="form-note">Nezávazná nabídka zdarma, odpověď obvykle do dvou dnů. Údaje použiji jen k odpovědi na vaši poptávku.</p>
    </form>
  )
}
