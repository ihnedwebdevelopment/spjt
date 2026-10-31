import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { useBusiness } from '../content/store'
import Icon from './Icon'
import photoUrl from '../images/interier-po.webp'
import maskUrl from '../images/interier-po-stena.png'
import { RatingBadge } from './Reviews'
import { composite, hexToLab, rgbToLab, type Layer, type Photo } from '../photo/recolor'

/** Odstíny ve vzorníku. První je současný stav stěny na fotce. */
const DECK = [
  { name: 'Současný stav', hex: null },
  { name: 'Šalvějová', hex: '#a7b79a' },
  { name: 'Petrolejová', hex: '#2f6b72' },
  { name: 'Terakota', hex: '#c0674a' },
  { name: 'Medová', hex: '#e0b256' },
  { name: 'Ledová modř', hex: '#cfe0ea' },
  { name: 'Půlnoční modrá', hex: '#1f2f52' },
  { name: 'Broskvový květ', hex: '#f1cdb0' },
] as const

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image()
  i.onload = () => res(i)
  i.onerror = rej
  i.src = src
})

/** Připraví fotku a masku stěny (maska je spočítaná předem, viz src/images/interier-po-stena.png). */
async function prepare(): Promise<{ photo: Photo; layer: Layer }> {
  const [img, mask] = await Promise.all([loadImg(photoUrl), loadImg(maskUrl)])
  const w = img.naturalWidth, h = img.naturalHeight
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const src = ctx.getImageData(0, 0, w, h).data
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(mask, 0, 0, w, h)
  const md = ctx.getImageData(0, 0, w, h).data
  const lab = new Float32Array(w * h * 3)
  const alpha = new Float32Array(w * h)
  const hist = new Uint32Array(101)
  for (let i = 0; i < w * h; i++) {
    const a = md[i * 4] / 255
    alpha[i] = a
    if (a < 0.02) continue
    const [L, A, B] = rgbToLab(src[i * 4], src[i * 4 + 1], src[i * 4 + 2])
    lab[i * 3] = L
    lab[i * 3 + 1] = A
    lab[i * 3 + 2] = B
    if (a > 0.9) hist[Math.round(L)]++
  }
  let n = 0, acc = 0, refL = 80
  for (const v of hist) n += v
  for (let L = 0; L <= 100; L++) { acc += hist[L]; if (acc >= n / 2) { refL = L; break } }
  return {
    photo: { w, h, src, lab, edge: new Float32Array(0) },
    layer: { id: 'hero', hex: '#ffffff', mask: new Uint8Array(0), alpha, refL },
  }
}

export default function Hero() {
  const BUSINESS = useBusiness()
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)
  const [touched, setTouched] = useState(false)
  const [front, setFront] = useState<0 | 1>(0)
  const [painted, setPainted] = useState(false)
  const data = useRef<{ photo: Photo; layer: Layer } | null>(null)
  const cache = useRef(new Map<number, ImageData>())
  const canvases = [useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null)]

  useEffect(() => {
    let alive = true
    const start = () => prepare().then((d) => { if (alive) { data.current = d; setReady(true) } }).catch(() => {})
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback
    if (idle) idle(start)
    else setTimeout(start, 300)
    return () => { alive = false }
  }, [])

  const frame = useCallback((i: number) => {
    const d = data.current
    if (!d) return null
    const hit = cache.current.get(i)
    if (hit) return hit
    const img = new ImageData(d.photo.w, d.photo.h)
    const hex = DECK[i].hex
    if (hex) composite(d.photo, [{ ...d.layer, hex }], img)
    else img.data.set(d.photo.src)
    cache.current.set(i, img)
    return img
  }, [])

  const show = useCallback((i: number) => {
    const img = frame(i)
    if (!img) return
    const next = front === 0 ? 1 : 0
    const c = canvases[next].current
    if (!c) return
    c.width = img.width
    c.height = img.height
    c.getContext('2d')!.putImageData(img, 0, 0)
    setFront(next)
    setPainted(true)
    setActive(i)
    // předpočítat další odstín, ať je přechod okamžitý
    setTimeout(() => frame((i + 1) % DECK.length), 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, front])

  // jemné samovolné procházení vzorníku, dokud návštěvník sám neklepne
  useEffect(() => {
    if (!ready || touched || reduce) return
    const t = setTimeout(() => show(active === 0 ? 1 : (active % (DECK.length - 1)) + 1), active === 0 ? 1400 : 3200)
    return () => clearTimeout(t)
  }, [ready, touched, reduce, active, show])

  const pick = (i: number) => {
    setTouched(true)
    show(i)
  }

  const current = DECK[active]
  const n = DECK.length

  return (
    <section className="hero" aria-label="Úvod">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1>Vyberte odstín. Zbytek nechte na mně.</h1>
          <p className="lead">
            Maluji byty, domy i fasády v Jihlavě a po celé Vysočině. Klepněte na vzorník a uvidíte stěnu z mé skutečné zakázky v jiné barvě.
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/kontakt">Nezávazně poptat</Link>
            <Link className="btn ghost" to="/vizualizator?rezim=foto"><Icon name="camera" size={18} />Přebarvit svou fotku</Link>
          </div>
          <p className="hero-meta">
            <a href={`tel:${BUSINESS.phoneTel}`}><Icon name="phone" size={16} />{BUSINESS.phoneDisplay}</a>
            <span>Voláte přímo mně. Nabídku pošlu do dvou dnů, zdarma.</span>
          </p>
          <RatingBadge />
        </div>

        <div className="hero-stage">
          <figure className="hero-photo">
            <img src={photoUrl} alt="Pokoj po výmalbě – skutečná zakázka" fetchPriority="high" width={1012} height={890} />
            {[0, 1].map((k) => (
              <canvas key={k} ref={canvases[k]} aria-hidden className={painted && front === k ? 'on' : ''} />
            ))}
            <figcaption aria-live="polite">
              <i style={{ background: current.hex ?? '#f2f2ef' }} />
              {current.hex ? current.name : 'Současný stav'}
            </figcaption>
          </figure>

          <div className="deck" role="radiogroup" aria-label="Vzorník odstínů">
            {DECK.map((d, i) => {
              const rel = i - active
              return (
                <button
                  key={d.name}
                  role="radio"
                  aria-checked={i === active}
                  className="deck-strip"
                  disabled={!ready}
                  style={{
                    ['--c' as string]: d.hex ?? '#f2f2ef',
                    ['--ink' as string]: d.hex && hexToLab(d.hex)[0] < 55 ? '#fff' : '#10203f',
                    ['--r' as string]: `${(rel === 0 ? 0 : (i - (n - 1) / 2) * 6 - 2)}deg`,
                    zIndex: rel === 0 ? 20 : 10 - Math.abs(rel),
                  }}
                  onClick={() => pick(i)}
                >
                  <span>{d.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
