import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import beton from '../images/betonova-sterka-seda.webp'
import zlata from '../images/zlata-dekorativni-sterka.webp'
import strop from '../images/jemna-struktura-strop.webp'
import detail from '../images/dekorativni-sterka-detail.webp'

const SURFACES = [
  { id: 'beton', label: 'Betonová stěrka', img: beton, pos: '50% 40%', text: 'Industriální vzhled s jemnými mráčky. Každá stěna je jiná, protože se tahy dělají ručně.' },
  { id: 'zlata', label: 'Zlatá stěrka', img: zlata, pos: '50% 30%', text: 'Kovový efekt na jednu akcentní stěnu. Ve dne zlatavý, večer při lampě hřejivý.' },
  { id: 'strop', label: 'Struktura na stropě', img: strop, pos: '50% 35%', text: 'Jemná struktura, která oživí i strop. Světlo z okna po ní klouže a vytváří stíny.' },
  { id: 'ruka', label: 'Ruční nanášení', img: detail, pos: '50% 50%', text: 'Stěrky nanáším špachtlí v několika tenkých vrstvách. Odstín i strukturu vybíráme spolu podle místnosti.' },
] as const

/** Stěrky zblízka: skutečné fotky, přes které „klouže“ světlo podle pohybu myši či prstu. */
export default function FinishLab() {
  const [idx, setIdx] = useState(0)
  const stage = useRef<HTMLDivElement>(null)
  const s = SURFACES[idx]

  const move = (e: React.PointerEvent) => {
    const el = stage.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--lx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--ly', `${((e.clientY - r.top) / r.height) * 100}%`)
    el.classList.add('lit')
  }

  return (
    <section className="section" id="sterky">
      <div className="wrap finish">
        <div ref={stage} className="finish-stage" onPointerMove={move} onPointerLeave={() => stage.current?.classList.remove('lit')}>
          {SURFACES.map((x, n) => (
            <img key={x.id} src={x.img} alt={x.label} loading="lazy" decoding="async" className={n === idx ? 'on' : ''} style={{ objectPosition: x.pos }} />
          ))}
          <span className="finish-light" aria-hidden />
          <span className="hint">Přejeďte po fotce, jako byste stěnu kontrolovali proti světlu</span>
        </div>
        <div className="finish-copy">
          <h2>Stěrky zblízka</h2>
          <p className="lead">Betonová stěrka, benátský štuk a zlatý efekt. Tady jsou skutečné stěny, které jsem dělal, ne vzorky z katalogu.</p>
          <div className="pills" role="tablist" aria-label="Povrch">
            {SURFACES.map((x, n) => (
              <button key={x.id} role="tab" className="pill" aria-selected={n === idx} aria-pressed={n === idx} onClick={() => setIdx(n)}>{x.label}</button>
            ))}
          </div>
          <p className="finish-note">{s.text}</p>
          <Link to="/dekorativni-sterky-jihlava" className="text-link">Více o dekorativních stěrkách</Link>
        </div>
      </div>
    </section>
  )
}
