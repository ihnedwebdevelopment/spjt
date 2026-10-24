import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PRESETS } from '../data/presets'
import { FLOORS, type FloorId } from '../lib/textures'
import { fmt, WALL_IDS } from '../lib/geometry'
import { clampItem, useDesigner } from '../store/designer'
import type { Design, SurfaceId, WallId } from '../store/types'
import { rgbToLab, labToRgb } from '../photo/recolor'
import Icon from '../components/Icon'

const SIZES = [
  { label: 'Malá', w: 3, d: 3 },
  { label: 'Střední', w: 4.2, d: 3.8 },
  { label: 'Velká', w: 5.4, d: 4.6 },
]
const WALL_NAME: Record<WallId, string> = { N: 'vzadu', E: 'vpravo', S: 'vpředu', W: 'vlevo' }

/** Odhad stávající barvy stěn z fotky: medián světlých, málo sytých pixelů v horní části snímku. */
async function wallColorFromPhoto(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    c.width = 96
    c.height = 96
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, 96, 96)
    const d = ctx.getImageData(0, 0, 96, 60).data // horních ~60 % = převážně stěny
    const Ls: number[] = [], As: number[] = [], Bs: number[] = []
    for (let i = 0; i < d.length; i += 4) {
      const [L, A, B] = rgbToLab(d[i], d[i + 1], d[i + 2])
      if (L < 35 || Math.hypot(A, B) > 45) continue
      Ls.push(L); As.push(A); Bs.push(B)
    }
    if (Ls.length < 50) return null
    const med = (a: number[]) => a.sort((x, y) => x - y)[Math.floor(a.length * 0.6)]
    // fotky bývají podexponované – jas mírně zvedneme
    const [r, g, b] = labToRgb(Math.min(97, med(Ls) * 1.08), med(As), med(Bs))
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

function Plan({ w, d, windowWall, doorWall, onPick }: { w: number; d: number; windowWall: WallId; doorWall: WallId; onPick: (wall: WallId) => void }) {
  const S = 150 / Math.max(w, d)
  const W = w * S, D = d * S, x0 = (180 - W) / 2, y0 = (180 - D) / 2
  const seg: Record<WallId, [number, number, number, number]> = {
    N: [x0, y0, x0 + W, y0], S: [x0, y0 + D, x0 + W, y0 + D], W: [x0, y0, x0, y0 + D], E: [x0 + W, y0, x0 + W, y0 + D],
  }
  const mark = (wall: WallId, kind: 'window' | 'door') => {
    const [a, b, c, e] = seg[wall]
    const mx = (a + c) / 2, my = (b + e) / 2
    const horiz = b === e
    const len = (kind === 'window' ? 1.4 : 0.9) * S
    const r = { x: horiz ? mx - len / 2 : mx - 5, y: horiz ? my - 5 : my - len / 2, w: horiz ? len : 10, h: horiz ? 10 : len }
    return kind === 'window'
      ? <rect {...{ x: r.x, y: r.y, width: r.w, height: r.h }} fill="#cfe6f5" stroke="#1b1a17" strokeWidth="1.5" />
      : <rect {...{ x: r.x, y: r.y, width: r.w, height: r.h }} fill="#b38559" stroke="#1b1a17" strokeWidth="1.5" />
  }
  return (
    <svg viewBox="0 0 180 192" className="plan" role="group" aria-label="Půdorys – klepněte na stěnu">
      <rect x={x0} y={y0} width={W} height={D} fill="#ebe6dc" />
      {WALL_IDS.map((k) => {
        const [a, b, c, e] = seg[k]
        return (
          <g key={k} className="plan-wall" onClick={() => onPick(k)}>
            <line x1={a} y1={b} x2={c} y2={e} stroke="transparent" strokeWidth="18" />
            <line x1={a} y1={b} x2={c} y2={e} stroke="#1b1a17" strokeWidth="4" strokeLinecap="square" />
          </g>
        )
      })}
      {mark(windowWall, 'window')}
      {mark(doorWall, 'door')}
      <text x="90" y={y0 + D + 13} textAnchor="middle" fontSize="8.5" fill="#8b8478">vpředu</text>
    </svg>
  )
}

export default function RoomWizard() {
  const open = useDesigner((s) => s.wizard)
  const { addRoom, openWizard } = useDesigner.getState()

  const [type, setType] = useState(PRESETS[0].id)
  const preset = PRESETS.find((p) => p.id === type)!
  const base = useMemo(() => preset.make(), [preset])
  const [name, setName] = useState(preset.label)
  const [named, setNamed] = useState(false)
  const [w, setW] = useState(base.room.w)
  const [d, setD] = useState(base.room.d)
  const [h, setH] = useState(base.room.h)
  const [windowWall, setWindowWall] = useState<WallId>(base.windowWall)
  const [doorWall, setDoorWall] = useState<WallId>(base.doorWall)
  const [picking, setPicking] = useState<'window' | 'door'>('window')
  const [floor, setFloor] = useState<FloorId>(base.floor)
  const [furnish, setFurnish] = useState(true)
  const [photo, setPhoto] = useState<string | null>(null)
  const [existing, setExisting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // změna typu převezme jeho výchozí hodnoty
  useEffect(() => {
    setW(base.room.w); setD(base.room.d); setH(base.room.h)
    setWindowWall(base.windowWall); setDoorWall(base.doorWall); setFloor(base.floor)
    if (!named) setName(preset.label)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openWizard(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, openWizard])

  if (!open) return null

  const pickWall = (k: WallId) => {
    if (picking === 'window') {
      setWindowWall(k)
      if (doorWall === k) setDoorWall(windowWall)
      setPicking('door')
    } else {
      setDoorWall(k)
      if (windowWall === k) setWindowWall(doorWall)
      setPicking('window')
    }
  }

  const onPhoto = async (f: File) => {
    setPhoto((p) => { if (p) URL.revokeObjectURL(p); return URL.createObjectURL(f) })
    setExisting(await wallColorFromPhoto(f))
  }

  const create = () => {
    const design: Design = { ...base, room: { w, d, h }, windowWall, doorWall, floor }
    const kx = w / base.room.w, kz = d / base.room.d
    design.furniture = furnish
      ? base.furniture.map((f) => ({ ...f, ...clampItem(design, f, f.x * kx, f.z * kz) }))
      : []
    if (existing) {
      const before = { ...design.before }
      for (const k of ['wallN', 'wallE', 'wallS', 'wallW'] as SurfaceId[]) before[k] = { ...before[k], hex: existing }
      design.before = before
    }
    addRoom(name.trim() || preset.label, design)
    if (photo) URL.revokeObjectURL(photo)
    setPhoto(null)
    setExisting(null)
    setNamed(false)
  }

  return createPortal(
    <div className="wizard-veil" role="dialog" aria-modal="true" aria-labelledby="wiz-title" onClick={(e) => e.target === e.currentTarget && openWizard(false)}>
      <div className="wizard">
        <header className="wizard-head">
          <div>
            <span className="eyebrow">Nová místnost</span>
            <h2 id="wiz-title">Postavte si <em>svoji</em> místnost</h2>
          </div>
          <button className="wizard-x" aria-label="Zavřít" onClick={() => openWizard(false)}>✕</button>
        </header>

        <div className="wizard-body">
          <section>
            <div className="group-title">1 · Typ místnosti</div>
            <div className="wiz-types">
              {PRESETS.map((p) => (
                <button key={p.id} className="chip" aria-pressed={type === p.id} onClick={() => setType(p.id)}>{p.label}</button>
              ))}
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="wiz-name">Název</label>
              <input id="wiz-name" value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setNamed(true) }} />
            </div>
          </section>

          <section>
            <div className="group-title"><span>2 · Rozměry</span><span className="wiz-area">{fmt(w * d)} m² podlahy</span></div>
            <div className="chips" style={{ marginBottom: 12 }}>
              {SIZES.map((z) => <button key={z.label} className="chip" onClick={() => { setW(z.w); setD(z.d) }}>{z.label} {fmt(z.w)} × {fmt(z.d)} m</button>)}
            </div>
            <div className="stack">
              {([['Šířka', w, setW, 2.5, 9], ['Hloubka', d, setD, 2.5, 9], ['Výška stropu', h, setH, 2.2, 3.6]] as const).map(([l, v, fn, lo, hi]) => (
                <div className="slider" key={l}>
                  <label>{l}<output>{fmt(v)} m</output></label>
                  <input type="range" min={lo} max={hi} step={0.05} value={v} onChange={(e) => fn(+e.target.value)} />
                </div>
              ))}
            </div>
            <p className="hint">Stačí odhad – přesně to změříme při prohlídce.</p>
          </section>

          <section className="wiz-plan">
            <div className="group-title">3 · Okno a dveře</div>
            <div className="seg" style={{ marginBottom: 10 }}>
              <button aria-pressed={picking === 'window'} onClick={() => setPicking('window')}>Okno · {WALL_NAME[windowWall]}</button>
              <button aria-pressed={picking === 'door'} onClick={() => setPicking('door')}>Dveře · {WALL_NAME[doorWall]}</button>
            </div>
            <Plan w={w} d={d} windowWall={windowWall} doorWall={doorWall} onPick={pickWall} />
            <p className="hint">{picking === 'window' ? 'Klepněte v půdorysu na stěnu s oknem.' : 'Klepněte v půdorysu na stěnu s dveřmi.'} Pohled kamery je zepředu.</p>
          </section>

          <section>
            <div className="group-title">4 · Podlaha a vybavení</div>
            <div className="chips">
              {FLOORS.map((f) => (
                <button key={f.id} className="chip" aria-pressed={floor === f.id} onClick={() => setFloor(f.id)}><i style={{ background: f.swatch }} />{f.label}</button>
              ))}
            </div>
            <div className="seg" style={{ marginTop: 12 }}>
              <button aria-pressed={furnish} onClick={() => setFurnish(true)}>Zařídit podle typu</button>
              <button aria-pressed={!furnish} onClick={() => setFurnish(false)}>Prázdná místnost</button>
            </div>
          </section>

          <section>
            <div className="group-title">5 · Fotka místnosti (nepovinné)</div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = '' }} />
            {photo ? (
              <div className="wiz-photo">
                <img src={photo} alt="Vaše fotka místnosti" />
                <div>
                  {existing ? (
                    <p><span className="dot" style={{ background: existing }} />Stávající barvu stěn jsme odhadli z fotky – použije se pro porovnání <b>před / po</b>.</p>
                  ) : (
                    <p>Barvu stěn se z fotky nepodařilo spolehlivě zjistit. Nastavíte ji později v záložce Barvy.</p>
                  )}
                  <p className="hint">Fotka slouží jako předloha pro rozměry a okno. Zůstává jen ve vašem zařízení.</p>
                  <button className="chip ghost" onClick={() => fileRef.current?.click()}>Jiná fotka</button>
                </div>
              </div>
            ) : (
              <button className="upload" onClick={() => fileRef.current?.click()}>
                <Icon name="camera" size={22} />
                Přidat fotku místnosti
                <small>Zjistíme z ní stávající barvu stěn a budete ji mít po ruce při zadávání rozměrů.</small>
              </button>
            )}
          </section>
        </div>

        <footer className="wizard-foot">
          <button className="btn ghost" onClick={() => openWizard(false)}>Zrušit</button>
          <button className="btn" onClick={create}>Vytvořit místnost <Icon name="arrow" size={18} /></button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
