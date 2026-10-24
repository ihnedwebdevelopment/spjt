import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { BUSINESS } from '../config'
import { TRUST } from '../data/services'
import Icon from './Icon'
import beton from '../images/betonova-sterka-seda.webp'
import zlata from '../images/zlata-dekorativni-sterka.webp'

const ease = [0.22, 1, 0.36, 1] as const

export default function Hero() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const bigY = useTransform(scrollY, [0, 800], [0, reduce ? 0 : 60])
  const smallY = useTransform(scrollY, [0, 800], [0, reduce ? 0 : -50])
  const intro = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay: d, ease } })

  return (
    <section className="hero" aria-label="Úvod">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <motion.span className="eyebrow" {...intro(0.05)}>Malířství &amp; natěračství — {BUSINESS.area}</motion.span>
          <motion.h1 {...intro(0.15)}>
            Stěny, které si budete <em>prohlížet.</em>
          </motion.h1>
          <motion.p className="lead" {...intro(0.3)}>
            Výmalby, dekorativní stěrky a fasády s pečlivou přípravou podkladu. A než vezmeme váleček do ruky, uvidíte svou místnost ve 3D.
          </motion.p>
          <motion.div className="hero-actions" {...intro(0.42)}>
            <Link className="btn" to="/kontakt">Nezávazná poptávka <Icon name="arrow" size={18} /></Link>
            <Link className="btn ghost" to="/vizualizator">Vyzkoušet barvy ve 3D</Link>
          </motion.div>
          <motion.a className="hero-phone" href={`tel:${BUSINESS.phoneTel}`} {...intro(0.52)}>
            <Icon name="phone" size={18} /> Nebo rovnou volejte <b>{BUSINESS.phoneDisplay}</b>
          </motion.a>
        </div>

        <div className="hero-media" aria-hidden>
          <motion.figure className="hm hm-main" style={{ y: bigY }} {...(reduce ? {} : { initial: { opacity: 0, scale: 1.04 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 1.4, ease } })}>
            <img src={beton} alt="" fetchPriority="high" />
            <figcaption>Betonová stěrka</figcaption>
          </motion.figure>
          <motion.figure className="hm hm-small" style={{ y: smallY }} {...intro(0.6)}>
            <img src={zlata} alt="" />
            <figcaption>Zlatá stěrka</figcaption>
          </motion.figure>
          <span className="hm-note">Vlastní realizace<br />Vysočina</span>
        </div>
      </div>

      <div className="wrap">
        <ul className="trust">
          {TRUST.map((t, n) => (
            <motion.li key={t.k} {...intro(0.6 + n * 0.08)}>
              <b>{t.k}</b>
              <span>{t.v}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
