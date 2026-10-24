import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import Icon from './Icon'
import { PROCESS, PROMISES, SERVICES } from '../data/services'
import { REALIZACE, type Realizace } from '../data/realizace'
import { HERO_LOOKS } from '../data/heroLooks'
import { webglSupported } from '../lib/webgl'
import { BUSINESS } from '../config'
import portrait from '../images/spejtek-remeslnik.webp'
import leseni from '../images/hero-malir-na-leseni.webp'
import pokojPred from '../images/pokoj-pred.webp'
import pokojPo from '../images/pokoj-po.webp'

const HeroScene = lazy(() => import('./HeroScene'))

/* ───────── realizace: před a po ───────── */
export function GalleryCard({ r }: { r: Realizace }) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-3%', '3%'])
  const [pos, setPos] = useState(50)
  const imgStyle = { objectPosition: r.focus ?? '50% 50%' }
  return (
    <div className={'gal-cell' + (r.wide ? ' wide' : '')}>
      <figure className={'gal-item' + (r.before ? ' compare' : '')} ref={ref}>
        <motion.div className="gal-media" style={{ y }}>
          {r.before ? (
            <>
              <img src={r.before} alt={`${r.title} – před`} loading="lazy" decoding="async" style={imgStyle} />
              <img src={r.image} alt={`${r.title} – po`} loading="lazy" decoding="async" style={{ ...imgStyle, clipPath: `inset(0 0 0 ${pos}%)` }} />
            </>
          ) : (
            <img src={r.image} alt={r.title} loading="lazy" decoding="async" style={imgStyle} />
          )}
        </motion.div>
        {r.before && (
          <>
            <span className="gal-tag left">Před</span>
            <span className="gal-tag right">Po</span>
            <span className="gal-divider" style={{ left: `${pos}%` }} aria-hidden><i><Icon name="compare" size={18} /></i></span>
            <input
              type="range" min={0} max={100} value={pos} className="gal-range"
              aria-label={`Porovnat před a po: ${r.title}`}
              onChange={(e) => setPos(Number(e.target.value))}
            />
          </>
        )}
        <figcaption><b>{r.title}</b><small>{r.kind}</small></figcaption>
      </figure>
    </div>
  )
}

export function Gallery() {
  return (
    <section className="section" id="realizace">
      <div className="wrap">
        <header className="section-head">
          <h2>Před a po</h2>
          <p className="lead">Zakázky z Jihlavy a okolí, nafocené telefonem přímo na místě. U dvojic táhněte jezdcem do stran.</p>
        </header>
        <div className="gal">
          {REALIZACE.map((r) => <GalleryCard key={r.id} r={r} />)}
        </div>
      </div>
    </section>
  )
}

/* ───────── služby ───────── */
export function Services() {
  const [active, setActive] = useState(0)
  return (
    <section className="section tint" id="sluzby">
      <div className="wrap">
        <header className="section-head">
          <h2>Co pro vás udělám</h2>
          <p className="lead">Od jedné opravené zdi po fasádu celého domu. Přípravu podkladu, zakrytí i úklid dělám vždy sám.</p>
        </header>
        <div className="svc">
          <div className="svc-media" aria-hidden>
            <AnimatePresence initial={false}>
              <motion.img
                key={SERVICES[active].id}
                src={SERVICES[active].image}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              />
            </AnimatePresence>
          </div>
          <ul className="svc-list">
            {SERVICES.map((s, n) => (
              <li key={s.id} className={active === n ? 'on' : ''}>
                <Link to={'/' + s.slug} className="svc-row" onMouseEnter={() => setActive(n)} onFocus={() => setActive(n)}>
                  <span className="svc-body">
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                    <span className="text-link">Podrobnosti a ukázky</span>
                  </span>
                  <img className="svc-thumb" src={s.image} alt="" loading="lazy" decoding="async" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ───────── vyzkoušejte doma: fotka nebo 3D ───────── */
export function Visualizer() {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [i, setI] = useState(0)
  const [pos, setPos] = useState(48)
  const reduce = useReducedMotion()
  const gl = webglSupported()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { setVisible(e.isIntersecting); if (e.isIntersecting) setNear(true) }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (reduce || !visible) return
    const t = setInterval(() => setI((x) => (x + 1) % HERO_LOOKS.length), 3800)
    return () => clearInterval(t)
  }, [reduce, visible])

  return (
    <section className="section dark" id="vizualizator">
      <div className="wrap">
        <header className="section-head">
          <h2>Vyzkoušejte si barvy doma</h2>
          <p className="lead">Než přijedu, můžete si výmalbu prohlédnout dvěma způsoby. Návrh mi pak pošlete jedním tlačítkem s poptávkou.</p>
        </header>

        <div className="tryout">
          <article className="try">
            <div className="try-visual">
              <img src={pokojPred} alt="" loading="lazy" />
              <img src={pokojPo} alt="Pokoj přebarvený na fotce" loading="lazy" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
              <span className="gal-divider" style={{ left: `${pos}%` }} aria-hidden><i><Icon name="compare" size={18} /></i></span>
              <input type="range" className="gal-range" min={0} max={100} value={pos} aria-label="Porovnat před a po" onChange={(e) => setPos(+e.target.value)} />
            </div>
            <div className="try-copy">
              <h3>Na fotce vašeho pokoje</h3>
              <p>Vyfoťte místnost mobilem, klepněte na stěnu a vyberte odstín. Stíny i světlo z okna zůstanou, takže výsledek odpovídá skutečnosti. Fotka zůstává ve vašem telefonu.</p>
              <Link className="btn light" to="/vizualizator?rezim=foto"><Icon name="camera" size={18} />Přebarvit svou fotku</Link>
            </div>
          </article>

          <article className="try">
            <div className="try-visual scene" ref={ref}>
              {gl && near && (
                <Suspense fallback={null}>
                  <HeroScene look={HERO_LOOKS[i]} active={visible} scrollLinked={false} />
                </Suspense>
              )}
              <span className="try-chip"><i style={{ background: HERO_LOOKS[i].swatch }} />{HERO_LOOKS[i].name}</span>
            </div>
            <div className="try-copy">
              <h3>Ve 3D místnosti od nuly</h3>
              <p>Zadejte rozměry, okno a dveře, vyzkoušejte stěrky i světlo od rána do večera. Spočítá plochu stěn i spotřebu barvy pro všechny místnosti.</p>
              <Link className="btn ghost-light" to="/vizualizator"><Icon name="cube" size={18} />Otevřít 3D místnost</Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

/* ───────── kdo jsem a jak pracuji ───────── */
export function Process() {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 55%'] })
  const w = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  return (
    <section className="section" id="pristup">
      <div className="wrap">
        <div className="about">
          <div className="about-copy">
            <h2>Voláte přímo mně, ne na dispečink</h2>
            <p className="lead">Zakázku od první prohlídky po úklid dělám sám. Proto vím, co je pod barvou, a za výsledkem si stojím.</p>
            <a className="about-phone" href={`tel:${BUSINESS.phoneTel}`}><Icon name="phone" size={20} />{BUSINESS.phoneDisplay}</a>
          </div>
          <div className="about-media">
            <figure className="about-portrait">
              <img src={portrait} alt="Řemeslník Malířství Špejtek" loading="lazy" decoding="async" />
            </figure>
            <figure className="about-work">
              <img src={leseni} alt="Malování na lešení v obchodních prostorách" loading="lazy" decoding="async" />
            </figure>
          </div>
        </div>

        <ul className="promises">
          {PROMISES.map((p) => (
            <li key={p.title}><h4>{p.title}</h4><p>{p.text}</p></li>
          ))}
        </ul>

        <h3 className="steps-title">Jak to proběhne</h3>
        <ol className="steps" ref={ref}>
          <motion.span aria-hidden className="steps-progress" style={{ scaleX: w }} />
          {PROCESS.map((p, n) => (
            <li key={p.title}>
              <span className="step-num">{n + 1}</span>
              <h4>{p.title}</h4>
              <p>{p.text}</p>
              <ul className="step-points">{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
