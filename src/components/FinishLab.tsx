import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import { webglSupported } from '../lib/webgl'
import { swatchDataURL } from '../lib/textures'

const FinishCanvas = lazy(() => import('./FinishCanvas'))

export const FINISH_OPTIONS = [
  { id: 'concrete', label: 'Betonová stěrka', text: 'Industriální vzhled s jemnými mráčky. Přejeďte myší a podívejte se, jak světlo dopadá do struktury.', colors: ['#9b9b97', '#b8b5ae', '#6f6f6b', '#c9c3b6'] },
  { id: 'venetian', label: 'Benátský štuk', text: 'Hladký, hluboký povrch s jemným leskem. Vzniká v několika tenkých vrstvách, ruční prací.', colors: ['#e6dcc3', '#d9bd96', '#cfe0ea', '#a7b79a'] },
  { id: 'gold', label: 'Zlatá stěrka', text: 'Kovový efekt pro jednu akcentovou stěnu. V denním světle zlatavý, večer hřejivý.', colors: ['#cfa84e', '#b9b3a6', '#b87333', '#8f8e89'] },
] as const

export default function FinishLab() {
  const [idx, setIdx] = useState(0)
  const [colorIdx, setColorIdx] = useState(0)
  const [near, setNear] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const gl = webglSupported()
  const opt = FINISH_OPTIONS[idx]
  const hex = opt.colors[colorIdx]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="section" id="sterky">
      <div className="wrap finish">
        <Reveal>
          <div className="finish-stage" ref={ref}>
            {gl && near ? (
              <Suspense fallback={null}>
                <FinishCanvas kind={opt.id} hex={hex} />
              </Suspense>
            ) : (
              <img src={swatchDataURL(opt.id, hex, 800, 700)} alt={opt.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <span className="hint">{gl ? 'Hýbejte myší – světlo vás následuje' : opt.label}</span>
          </div>
        </Reveal>
        <div className="finish-copy">
          <Reveal><span className="eyebrow">Dekorativní povrchy</span></Reveal>
          <Reveal delay={0.05}><h2>Povrch, který se chce <em>dotýkat</em></h2></Reveal>
          <Reveal delay={0.1}>
            <div className="pills" role="group" aria-label="Typ povrchu">
              {FINISH_OPTIONS.map((o, n) => (
                <button key={o.id} className="pill" aria-pressed={idx === n} onClick={() => { setIdx(n); setColorIdx(0) }}>{o.label}</button>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15}><p className="lead">{opt.text}</p></Reveal>
          <Reveal delay={0.2}>
            <div className="swatch-row" role="group" aria-label="Odstín">
              {opt.colors.map((c, n) => (
                <button key={c} aria-label={'Odstín ' + c} aria-pressed={colorIdx === n} style={{ background: c }} onClick={() => setColorIdx(n)} />
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
