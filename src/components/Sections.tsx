import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import Reveal from './Reveal'
import Icon from './Icon'
import { PROCESS, SERVICES } from '../data/services'
import { REALIZACE, type Realizace } from '../data/realizace'
import { HERO_LOOKS } from '../data/heroLooks'
import { webglSupported } from '../lib/webgl'
import { BUSINESS } from '../config'
import portrait from '../images/spejtek-remeslnik.webp'
import leseni from '../images/hero-malir-na-leseni.webp'

const HeroScene = lazy(() => import('./HeroScene'))
const pad = (n: number) => String(n).padStart(2, '0')

/* ───────── služby: rejstřík s fotkou ───────── */
export function Services() {
  const [active, setActive] = useState(0)
  return (
    <section className="section" id="sluzby">
      <div className="wrap">
        <div className="section-head split">
          <Reveal>
            <span className="eyebrow">Služby</span>
            <h2>Od malé opravy po <em>celý dům</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lead">Jedna ruka od přípravy podkladu po finální nátěr. Jihlava a celá Vysočina podle rozsahu zakázky.</p>
          </Reveal>
        </div>

        <div className="svc">
          <div className="svc-media" aria-hidden>
            <AnimatePresence initial={false}>
              <motion.img
                key={SERVICES[active].id}
                src={SERVICES[active].image}
                alt=""
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </AnimatePresence>
            <span className="svc-media-tag">{pad(active + 1)} / {pad(SERVICES.length)}</span>
          </div>

          <ol className="svc-list">
            {SERVICES.map((s, n) => (
              <li key={s.id} className={active === n ? 'on' : ''}>
                <Reveal delay={n * 0.05}>
                  <Link
                    to="/kontakt"
                    className="svc-row"
                    onMouseEnter={() => setActive(n)}
                    onFocus={() => setActive(n)}
                  >
                    <span className="svc-num">{pad(n + 1)}</span>
                    <span className="svc-body">
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </span>
                    <img className="svc-thumb" src={s.image} alt="" loading="lazy" decoding="async" />
                    <Icon name="arrow" className="svc-arrow" />
                  </Link>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ───────── realizace ───────── */
function GalleryCard({ r, n }: { r: Realizace; n: number }) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-4%', '4%'])
  const [pos, setPos] = useState(50)
  const imgStyle = { objectPosition: r.focus ?? '50% 50%' }
  return (
    <Reveal delay={(n % 3) * 0.06} className={'gal-cell' + (r.wide ? ' wide' : '')}>
      <figure className={'gal-item' + (r.before ? ' compare' : '')} ref={ref}>
        <motion.div className="gal-media" style={{ y }}>
          {r.before ? (
            <>
              <img src={r.before} alt={`${r.title} – před`} loading="lazy" decoding="async" style={imgStyle} />
              <img src={r.image} alt={`${r.title} – po`} loading="lazy" decoding="async" className="gal-after" style={{ ...imgStyle, clipPath: `inset(0 0 0 ${pos}%)` }} />
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
        <figcaption><small>{r.kind}</small><b>{r.title}</b></figcaption>
      </figure>
    </Reveal>
  )
}

export function Gallery() {
  return (
    <section className="section tint" id="realizace">
      <div className="wrap">
        <div className="section-head split">
          <Reveal>
            <span className="eyebrow">Realizace</span>
            <h2>Práce, za kterou <em>stojíme</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lead">Skutečné zakázky, žádné fotky z fotobanky. U dvojic před a po potáhněte posuvníkem.</p>
          </Reveal>
        </div>
        <div className="gal">
          {REALIZACE.map((r, n) => <GalleryCard key={r.id} r={r} n={n} />)}
        </div>
      </div>
    </section>
  )
}

/* ───────── 3D vizualizátor ───────── */
const FEATURES = [
  { i: 'camera', t: 'Vaše vlastní fotka', p: 'Vyfoťte pokoj, klepněte na stěnu a uvidíte ji v nové barvě. Stíny i světlo zůstanou.' },
  { i: 'walls', t: 'Každá stěna zvlášť', p: 'Přebarvěte stěnu, strop nebo sokl. Třeba jednu akcentní a ostatní jemně neutrální.' },
  { i: 'texture', t: 'Stěrky a štuk', p: 'Betonová stěrka, benátský štuk nebo zlatý efekt. Uvidíte strukturu, ne jen plochou barvu.' },
  { i: 'sun', t: 'Světlo během dne', p: 'Od rána do soumraku. Slunce svítí oknem a barva se mění jako ve skutečnosti.' },
  { i: 'compare', t: 'Před / po a hotové kombinace', p: 'Posuvník ukáže rozdíl, kurátorské kombinace pomohou začít.' },
  { i: 'ruler', t: 'Plocha a spotřeba', p: 'Spočítá plochu stěn bez oken a dveří i orientační množství barvy.' },
]

export function Visualizer() {
  const ref = useRef<HTMLAnchorElement>(null)
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [i, setI] = useState(0)
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
  const look = HERO_LOOKS[i]

  return (
    <section className="section dark" id="vizualizator">
      <div className="wrap viz">
        <div className="viz-copy">
          <Reveal>
            <span className="eyebrow">3D vizualizátor</span>
            <h2>Uvidíte svou místnost <em>vymalovanou</em>, než začneme</h2>
            <p className="lead">Nemusíte hádat podle malého vzorníku. Přebarvěte fotku svého pokoje nebo si postavte místnost ve 3D – a návrh nám pošlete s poptávkou.</p>
          </Reveal>
          <ul className="viz-feats">
            {FEATURES.map((f, n) => (
              <Reveal key={f.t} delay={n * 0.05}>
                <li><Icon name={f.i} size={22} /><div><b>{f.t}</b><span>{f.p}</span></div></li>
              </Reveal>
            ))}
          </ul>
          <Reveal className="viz-cta">
            <Link to="/vizualizator?rezim=foto" className="btn light"><Icon name="camera" size={18} /> Přebarvit svou fotku</Link>
            <Link to="/vizualizator" className="btn ghost-light">3D místnost <Icon name="arrow" size={18} /></Link>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <Link to="/vizualizator" className="viz-stage" ref={ref} aria-label="Otevřít 3D vizualizátor">
            {gl && near && (
              <Suspense fallback={null}>
                <HeroScene look={look} active={visible} scrollLinked={false} />
              </Suspense>
            )}
            <span className="viz-chip" aria-live="polite"><i style={{ background: look.swatch }} />{look.name}</span>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────── postup ───────── */
export function Process() {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 55%'] })
  const w = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  return (
    <section className="section" id="pristup">
      <div className="wrap">
        <div className="about">
          <Reveal className="about-copy">
            <span className="eyebrow">Postup</span>
            <h2>Řemeslník, který za prací <em>stojí</em></h2>
            <p className="lead">Osobní, přímý a bez dispečinku. Voláte mně, ne call centru. Zakázku od první prohlídky po úklid dělám sám – proto vím, co pod barvou je.</p>
            <a className="hero-phone" href={`tel:${BUSINESS.phoneTel}`}><Icon name="phone" size={18} /> Zavolejte mi <b>{BUSINESS.phoneDisplay}</b></a>
          </Reveal>
          <Reveal delay={0.1} className="about-media">
            <figure className="about-portrait">
              <img src={portrait} alt="Řemeslník Malířství Špejtek" loading="lazy" decoding="async" />
            </figure>
            <figure className="about-work">
              <img src={leseni} alt="Malování na lešení v obchodních prostorách" loading="lazy" decoding="async" />
              <figcaption>Na lešení i v obýváku</figcaption>
            </figure>
          </Reveal>
        </div>
        <ol className="steps" ref={ref}>
          <motion.span aria-hidden className="steps-progress" style={{ scaleX: w }} />
          {PROCESS.map((p, n) => (
            <li key={p.title}>
              <Reveal delay={n * 0.1}>
                <span className="step-num">{pad(n + 1)}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
