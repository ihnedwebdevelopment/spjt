import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BUSINESS } from '../config'
import { allRooms, useDesigner } from '../store/designer'
import { estimate, fmt } from '../lib/geometry'
import { shareUrl } from '../lib/urlState'

export default function ContactForm() {
  const [params] = useSearchParams()
  const design = useDesigner((s) => s.design)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [msg, setMsg] = useState('')
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
    if (fromPhoto) return `Návrh z mé fotky: ${photoSummary}. Upravenou fotku posílám v příloze.`
    const SIDE = { wallN: 'sever', wallE: 'východ', wallS: 'jih', wallW: 'západ', ceiling: 'strop', trim: 'sokl' } as const
    const one = (name: string, d: typeof design) => {
      const e = estimate(d)
      const walls = e.lines.map((l) => `${l.label} (${l.surfaces.map((x) => SIDE[x]).join(', ')})`).join('; ')
      return `${name} ${fmt(d.room.w)}×${fmt(d.room.d)}×${fmt(d.room.h)} m, ${fmt(e.totalArea, 0)} m²: ${walls}`
    }
    return `Návrh z 3D vizualizátoru (${rooms.length === 1 ? '1 místnost' : rooms.length + (rooms.length < 5 ? ' místnosti' : ' místností')}, celkem ${fmt(totalArea, 0)} m² k natření):\n` +
      rooms.map((r) => '• ' + one(r.name, r.design)).join('\n')
  }
  const body = () =>
    [`Dobrý den, tady ${name || '…'}${phone ? ' (' + phone + ')' : ''}.`, msg.trim(), withDesign ? designText() : ''].filter(Boolean).join('\n')

  const sms = () => {
    window.location.href = `sms:${BUSINESS.phoneTel}?&body=${encodeURIComponent(body())}`
    setDone('Otevírám zprávy ve vašem telefonu. Ještě přiložte fotky místnosti, ať vidím podklad.')
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body() + (withDesign && !fromPhoto ? '\n' + shareUrl(design) : ''))
      setDone('Zpráva je zkopírovaná včetně odkazu na návrh. Vložte ji do e-mailu nebo zprávy.')
    } catch {
      setDone('Kopírování se nepodařilo, zavolejte prosím na ' + BUSINESS.phoneDisplay + '.')
    }
  }

  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); sms() }}>
      <div className="field">
        <label htmlFor="c-name">Jméno</label>
        <input id="c-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="c-phone">Telefon</label>
        <input id="c-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="c-msg">Co potřebujete vymalovat?</label>
        <textarea id="c-msg" placeholder="Např. obývák 25 m², stěny a strop, termín v listopadu…" value={msg} onChange={(e) => setMsg(e.target.value)} />
      </div>
      <label className="attach">
        <input type="checkbox" checked={withDesign} onChange={(e) => setWithDesign(e.target.checked)} />
        <span>{fromPhoto
          ? <>Přiložit můj návrh z fotky ({photoSummary!.split(';').length} {photoSummary!.split(';').length === 1 ? 'plocha' : 'plochy'}). Staženou fotku přiložte ke zprávě.</>
          : <>Přiložit můj návrh z 3D vizualizátoru ({rooms.length > 1 ? `${rooms.length} ${rooms.length < 5 ? 'místnosti' : 'místností'}, ` : ''}{fmt(totalArea, 0)} m², {lines.length} {lines.length === 1 ? 'odstín' : lines.length < 5 ? 'odstíny' : 'odstínů'})</>}</span>
      </label>
      <div className="form-actions">
        <button className="btn" type="submit">Odeslat jako SMS</button>
        <button className="btn ghost" type="button" onClick={copy}>Zkopírovat zprávu</button>
      </div>
      {done && <p className="form-note" role="status">{done}</p>}
      <p className="form-note">Nezávazná nabídka zdarma, odpověď obvykle do dvou dnů. Formulář nic neodesílá na server, zpráva se otevře ve vašem telefonu.</p>
    </form>
  )
}
