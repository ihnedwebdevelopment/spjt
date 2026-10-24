import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PAINTS, type Paint } from '../data/paints'
import { BUSINESS } from '../config'
import { useDesigner } from '../store/designer'
import Icon from '../components/Icon'
import sampleLiving from '../images/interier-po.webp'
import sampleKitchen from '../images/priprava-kuchyne.webp'
import {
  composite, feather, loadPhoto, magicSelect, medianL, outline, paintDisc, unionInto,
  type Layer, type Photo,
} from './recolor'

type Tool = 'wand' | 'brush' | 'erase'
const GROUPS: Paint['group'][] = ['Neutrální', 'Teplé', 'Chladné', 'Zemité', 'Výrazné']
const DEFAULT_COLORS = ['#a7b79a', '#efe6d2', '#2f6b72', '#f1cdb0', '#d9bd96', '#1f2f52']
const paintName = (hex: string) => PAINTS.find((p) => p.hex.toLowerCase() === hex.toLowerCase())?.name ?? 'Vlastní odstín ' + hex.toUpperCase()

let uid = 0
const newLayer = (w: number, h: number, n: number): Layer => ({
  id: 'L' + uid++, hex: DEFAULT_COLORS[n % DEFAULT_COLORS.length], mask: new Uint8Array(w * h), alpha: null, refL: 70,
})

export default function PhotoMode({ modeSwitch }: { modeSwitch: ReactNode }) {
  const nav = useNavigate()
  const say = useDesigner((s) => s.say)
  const toast = useDesigner((s) => s.toast)

  const [photo, setPhoto] = useState<Photo | null>(null)
  const [layers, setLayers] = useState<Layer[]>([])
  const [active, setActive] = useState(0)
  const [tool, setTool] = useState<Tool>('wand')
  const [tol, setTol] = useState(32)
  const [brush, setBrush] = useState(24)
  const [compare, setCompare] = useState(false)
  const [split, setSplit] = useState(50)
  const [busy, setBusy] = useState(false)
  const [showSel, setShowSel] = useState(true)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [drop, setDrop] = useState(false)
  const [fit, setFit] = useState<{ w: number; h: number } | null>(null)
  const stageRef = useRef<HTMLElement>(null)

  const baseRef = useRef<HTMLCanvasElement>(null)
  const outRef = useRef<HTMLCanvasElement>(null)
  const selRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const undo = useRef<{ layer: number; mask: Uint8Array }[]>([])
  const lastWand = useRef<{ x: number; y: number; layer: number; before: Uint8Array } | null>(null)
  const stroke = useRef<{ last: [number, number] } | null>(null)
  const layersRef = useRef(layers)
  layersRef.current = layers

  /* ───────── načtení fotky ───────── */
  const open = useCallback(async (src: Blob | string) => {
    setBusy(true)
    try {
      const { photo: p, canvas } = await loadPhoto(src)
      setPhoto(p)
      setLayers([newLayer(p.w, p.h, 0)])
      setActive(0)
      setTool('wand')
      setCompare(false)
      undo.current = []
      lastWand.current = null
      requestAnimationFrame(() => {
        for (const c of [baseRef.current, outRef.current, selRef.current]) {
          if (!c) continue
          c.width = p.w
          c.height = p.h
        }
        baseRef.current?.getContext('2d')?.drawImage(canvas, 0, 0)
        outRef.current?.getContext('2d')?.drawImage(canvas, 0, 0)
      })
    } catch {
      say('Fotku se nepodařilo otevřít. Zkuste JPG nebo PNG.')
    } finally {
      setBusy(false)
    }
  }, [say])

  /* ───────── velikost fotky na ploše ───────── */
  useEffect(() => {
    const el = stageRef.current
    if (!el || !photo) return
    const calc = () => {
      const cs = getComputedStyle(el)
      const aw = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const ah = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      const k = Math.min(aw / photo.w, ah / photo.h)
      setFit({ w: Math.floor(photo.w * k), h: Math.floor(photo.h * k) })
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [photo])

  /* ───────── vykreslení výsledku ───────── */
  const render = useCallback((ls: Layer[]) => {
    const p = photo
    const out = outRef.current
    if (!p || !out) return
    const ctx = out.getContext('2d')!
    const img = ctx.createImageData(p.w, p.h)
    composite(p, ls, img)
    ctx.putImageData(img, 0, 0)
  }, [photo])

  const renderSelection = useCallback(() => {
    const p = photo
    const c = selRef.current
    const l = layersRef.current[active]
    if (!p || !c) return
    const ctx = c.getContext('2d')!
    if (!l || !showSel) { ctx.clearRect(0, 0, c.width, c.height); return }
    const img = ctx.createImageData(p.w, p.h)
    outline(l.mask, p.w, p.h, img, [255, 255, 255, 235])
    ctx.putImageData(img, 0, 0)
  }, [photo, active, showSel])

  useEffect(() => { renderSelection() }, [renderSelection, layers])

  const refresh = useCallback((idx: number, mask: Uint8Array) => {
    if (!photo) return
    setLayers((ls) => {
      const next = ls.slice()
      const l = { ...next[idx], mask }
      l.alpha = feather(mask, photo.w, photo.h)
      l.refL = medianL(photo, mask)
      next[idx] = l
      render(next)
      return next
    })
  }, [photo, render])

  /* ───────── interakce na fotce ───────── */
  const toImage = (e: React.PointerEvent) => {
    const c = outRef.current!
    const r = c.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height] as [number, number]
  }
  const brushPx = () => {
    const c = outRef.current!
    return (brush / c.getBoundingClientRect().width) * c.width
  }

  const onDown = (e: React.PointerEvent) => {
    if (!photo || compare) return
    const l = layersRef.current[active]
    if (!l) return
    const [x, y] = toImage(e)
    undo.current.push({ layer: active, mask: l.mask.slice() })
    if (undo.current.length > 20) undo.current.shift()
    if (tool === 'wand') {
      setBusy(true)
      setTimeout(() => {
        const before = l.mask.slice()
        const sel = magicSelect(photo, x, y, tol)
        const mask = before.slice()
        unionInto(mask, sel)
        lastWand.current = { x, y, layer: active, before }
        refresh(active, mask)
        setBusy(false)
      }, 30)
      return
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    stroke.current = { last: [x, y] }
    paintDisc(l.mask, photo.w, photo.h, x, y, brushPx(), tool === 'brush' ? 255 : 0)
    renderSelection()
  }

  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top })
    if (!stroke.current || !photo) return
    const l = layersRef.current[active]
    const [x, y] = toImage(e)
    const [lx, ly] = stroke.current.last
    const rad = brushPx()
    const steps = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / (rad * 0.4)))
    for (let s = 1; s <= steps; s++) paintDisc(l.mask, photo.w, photo.h, lx + ((x - lx) * s) / steps, ly + ((y - ly) * s) / steps, rad, tool === 'brush' ? 255 : 0)
    stroke.current.last = [x, y]
    renderSelection()
  }

  const onUp = () => {
    if (!stroke.current) return
    stroke.current = null
    lastWand.current = null
    refresh(active, layersRef.current[active].mask)
  }

  // změna citlivosti přepočítá poslední klepnutí hůlkou
  useEffect(() => {
    const lw = lastWand.current
    if (!lw || !photo || lw.layer !== active) return
    const t = setTimeout(() => {
      const mask = lw.before.slice()
      unionInto(mask, magicSelect(photo, lw.x, lw.y, tol))
      refresh(lw.layer, mask)
    }, 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tol])

  const doUndo = () => {
    const u = undo.current.pop()
    if (!u) return
    lastWand.current = null
    refresh(u.layer, u.mask)
  }

  const setColor = (hex: string) => {
    setLayers((ls) => {
      const next = ls.slice()
      if (!next[active]) return ls
      next[active] = { ...next[active], hex }
      render(next)
      return next
    })
  }

  const addLayer = () => {
    if (!photo || layers.length >= 6) return
    setLayers((ls) => [...ls, newLayer(photo.w, photo.h, ls.length)])
    setActive(layers.length)
    setTool('wand')
    lastWand.current = null
  }
  const removeLayer = (i: number) => {
    setLayers((ls) => {
      const next = ls.filter((_, n) => n !== i)
      const safe = next.length ? next : photo ? [newLayer(photo.w, photo.h, 0)] : []
      render(safe)
      return safe
    })
    setActive((a) => Math.max(0, Math.min(a, layers.length - 2)))
    undo.current = []
    lastWand.current = null
  }

  /* ───────── výstupy ───────── */
  const used = layers.filter((l) => l.alpha)
  const summary = () => used.map((l, n) => `Plocha ${n + 1}: ${paintName(l.hex)} (${l.hex.toUpperCase()})`).join('; ')

  const download = async () => {
    const out = outRef.current
    if (!out || !photo) return
    const bar = Math.max(70, Math.round(out.height * 0.1))
    const c = document.createElement('canvas')
    c.width = out.width
    c.height = out.height + bar
    const ctx = c.getContext('2d')!
    ctx.drawImage(out, 0, 0)
    ctx.fillStyle = '#161513'
    ctx.fillRect(0, out.height, c.width, bar)
    const fs = Math.round(bar * 0.24)
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f4f1ea'
    ctx.font = `600 ${fs}px "Inter Variable", system-ui, sans-serif`
    ctx.fillText(`${BUSINESS.name} · návrh výmalby`, bar * 0.3, out.height + bar * 0.32)
    let x = bar * 0.3
    ctx.font = `500 ${Math.round(fs * 0.85)}px "Inter Variable", system-ui, sans-serif`
    for (const l of used) {
      const label = paintName(l.hex)
      ctx.fillStyle = l.hex
      ctx.beginPath()
      ctx.arc(x + fs * 0.4, out.height + bar * 0.7, fs * 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(244,241,234,.75)'
      ctx.fillText(label, x + fs, out.height + bar * 0.7)
      x += fs * 1.6 + ctx.measureText(label).width
    }
    ctx.textAlign = 'right'
    ctx.fillStyle = '#93aaff'
    ctx.font = `600 ${fs}px "Inter Variable", system-ui, sans-serif`
    ctx.fillText(BUSINESS.phoneDisplay, c.width - bar * 0.3, out.height + bar * 0.32)
    const a = document.createElement('a')
    a.href = c.toDataURL('image/jpeg', 0.92)
    a.download = 'navrh-vymalby-z-fotky.jpg'
    a.click()
    say('Obrázek je stažený')
  }

  const send = () => {
    useDesigner.setState({ photoSummary: summary() })
    nav('/kontakt?navrh=foto')
  }

  /* ───────── klávesy ───────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const current = layers[active]

  return (
    <>
      <aside className="dpanel" aria-label="Přebarvení fotky">
        {modeSwitch}
        <div className="tabbody">
          <div>
            <div className="group-title">1 · Fotka místnosti</div>
            <div className="photo-pick">
              <button className="chip" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} />Nahrát fotku</button>
              <button className="chip only-touch" onClick={() => camRef.current?.click()}><Icon name="camera" size={16} />Vyfotit</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) open(f); e.target.value = '' }} />
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) open(f); e.target.value = '' }} />
            <p className="hint">Nebo vyzkoušejte ukázku: <button className="linkbtn" onClick={() => open(sampleLiving)}>pokoj</button> · <button className="linkbtn" onClick={() => open(sampleKitchen)}>kuchyň</button>. Fotka zůstává jen ve vašem zařízení.</p>
          </div>

          {photo && (
            <>
              <div>
                <div className="group-title">
                  <span>2 · Plochy</span>
                  {layers.length < 6 && <button className="chip ghost" onClick={addLayer}>+ Další plocha</button>}
                </div>
                <div className="list">
                  {layers.map((l, n) => (
                    <div key={l.id} className="layer-row">
                      <button aria-pressed={active === n} onClick={() => { setActive(n); lastWand.current = null }}>
                        <span className="dot" style={{ background: l.hex }} />
                        <span>Plocha {n + 1}<small>{l.alpha ? paintName(l.hex) : 'Klepněte na stěnu ve fotce'}</small></span>
                      </button>
                      {(layers.length > 1 || l.alpha) && (
                        <button className="layer-del" aria-label={`Smazat plochu ${n + 1}`} onClick={() => removeLayer(n)}><Icon name="trash" size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="hint">Každá plocha může mít jiný odstín – třeba jedna akcentní stěna a ostatní neutrální.</p>
              </div>

              <div>
                <div className="group-title">3 · Výběr plochy</div>
                <div className="seg" role="group" aria-label="Nástroj">
                  <button aria-pressed={tool === 'wand'} onClick={() => setTool('wand')}>Chytrý výběr</button>
                  <button aria-pressed={tool === 'brush'} onClick={() => setTool('brush')}>Štětec</button>
                  <button aria-pressed={tool === 'erase'} onClick={() => setTool('erase')}>Guma</button>
                </div>
                {tool === 'wand' ? (
                  <div className="slider" style={{ marginTop: 14 }}>
                    <label>Citlivost<output>{tol} %</output></label>
                    <input type="range" min={5} max={95} value={tol} onChange={(e) => setTol(+e.target.value)} />
                    <p className="hint" style={{ marginTop: 0 }}>Klepněte na stěnu. Když se vybere málo, přidejte citlivost nebo klepněte znovu vedle. Když přeteče na strop či nábytek, uberte.</p>
                  </div>
                ) : (
                  <div className="slider" style={{ marginTop: 14 }}>
                    <label>Velikost štětce<output>{brush} px</output></label>
                    <input type="range" min={6} max={90} value={brush} onChange={(e) => setBrush(+e.target.value)} />
                    <p className="hint" style={{ marginTop: 0 }}>{tool === 'brush' ? 'Přimalujte místa, která výběr minul.' : 'Smažte, co do plochy nepatří.'}</p>
                  </div>
                )}
                <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
                  <button className="chip" onClick={doUndo}><Icon name="undo" size={16} />Zpět</button>
                  <button className="chip" aria-pressed={showSel} onClick={() => setShowSel((v) => !v)}>Zobrazit výběr</button>
                </div>
              </div>

              <div>
                <div className="group-title">4 · Odstín plochy {active + 1}</div>
                {GROUPS.map((g) => (
                  <div key={g} style={{ marginBottom: 10 }}>
                    <div className="hint" style={{ margin: '0 0 6px' }}>{g}</div>
                    <div className="palette">
                      {PAINTS.filter((p) => p.group === g).map((p) => (
                        <button key={p.id} className="sw" title={p.name} aria-label={p.name} aria-pressed={current?.hex.toLowerCase() === p.hex.toLowerCase()} style={{ background: p.hex }} onClick={() => setColor(p.hex)} />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="colorpick" style={{ marginTop: 8 }}>
                  <input type="color" aria-label="Vlastní barva" value={current?.hex ?? '#ffffff'} onChange={(e) => setColor(e.target.value)} />
                  <span className="pal-name" style={{ margin: 0 }}><b>{current ? paintName(current.hex) : ''}</b></span>
                </div>
                <p className="hint">Barvy na displeji se liší od skutečnosti. Finální odstín vždy ověříme vzorníkem přímo u vás.</p>
              </div>

              <div className="stack">
                <button className="btn" onClick={send} disabled={!used.length}>Poslat návrh a poptat výmalbu</button>
                <button className="btn ghost" onClick={download} disabled={!used.length}>Stáhnout obrázek</button>
              </div>
            </>
          )}
        </div>
      </aside>

      <section
        ref={stageRef}
        className={'stage photo-stage' + (photo ? '' : ' empty')}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDrop(true) } }}
        onDragLeave={() => setDrop(false)}
        onDrop={(e) => { e.preventDefault(); setDrop(false); const f = e.dataTransfer.files?.[0]; if (f) open(f) }}
      >
        {!photo && (
          <div className="photo-empty">
            <span className="eyebrow">Vaše fotka</span>
            <h2>Vyfoťte svůj pokoj a <em>přebarvěte</em> ho</h2>
            <p className="lead">Klepnete na stěnu a ta se přebarví. Stíny, světlo i struktura zdi zůstanou, takže uvidíte, jak bude vypadat právě vaše místnost.</p>
            <div className="hero-actions">
              <button className="btn" onClick={() => fileRef.current?.click()}>Nahrát fotku <Icon name="arrow" size={18} /></button>
              <button className="btn ghost" onClick={() => open(sampleLiving)}>Vyzkoušet na ukázce</button>
            </div>
            <ul className="photo-tips">
              <li>Foťte za denního světla a co nejvíc zpříma na stěnu.</li>
              <li>Čím méně věcí na stěně, tím přesnější výběr.</li>
              <li>Fotka se nikam neodesílá – zpracuje se jen ve vašem prohlížeči.</li>
            </ul>
          </div>
        )}

        <div className={'photo-frame' + (photo ? '' : ' hidden')} style={fit ? { width: fit.w, height: fit.h } : undefined}>
          <canvas ref={baseRef} className="photo-base" aria-hidden />
          <canvas
            ref={outRef}
            className={'photo-out tool-' + tool}
            style={compare ? { clipPath: `inset(0 0 0 ${split}%)` } : undefined}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onPointerLeave={() => setCursor(null)}
            aria-label="Fotka – klepněte na stěnu"
          />
          <canvas ref={selRef} className="photo-sel" aria-hidden style={compare ? { opacity: 0 } : undefined} />
          {cursor && tool !== 'wand' && !compare && (
            <span className="brush-cursor" style={{ left: cursor.x, top: cursor.y, width: brush * 2, height: brush * 2 }} />
          )}
          {compare && (
            <>
              <span className="gal-tag left">Před</span>
              <span className="gal-tag right">Po</span>
              <span className="gal-divider" style={{ left: `${split}%` }} aria-hidden><i><Icon name="compare" size={18} /></i></span>
              <input type="range" className="gal-range" min={0} max={100} value={split} aria-label="Porovnat před a po" onChange={(e) => setSplit(+e.target.value)} />
            </>
          )}
        </div>

        {photo && (
          <div className="stage-top">
            <div className="floating">
              <button aria-pressed={compare} onClick={() => setCompare((v) => !v)}><Icon name="compare" size={17} /><span>Před / po</span></button>
              <button onClick={download} disabled={!used.length}><Icon name="download" size={17} /><span>Obrázek</span></button>
            </div>
            <div className="floating">
              <button onClick={() => fileRef.current?.click()}><Icon name="upload" size={17} /><span>Jiná fotka</span></button>
            </div>
          </div>
        )}

        {photo && !used.length && !busy && (
          <div className="stage-bottom"><div className="tip">Klepněte na stěnu, kterou chcete přebarvit.</div></div>
        )}
        {busy && <div className="photo-busy" role="status">Počítám…</div>}
        {toast && <div className="toast" role="status">{toast}</div>}
        {drop && <div className="drop-veil">Pusťte sem fotku místnosti</div>}
      </section>
    </>
  )
}
