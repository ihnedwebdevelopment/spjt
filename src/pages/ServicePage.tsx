import { Link } from 'react-router-dom'
import { type Service } from '../data/services'
import { useBusiness, useContent } from '../content/store'
import { GalleryCard } from '../components/Sections'
import ContactSection from '../components/ContactSection'
import Faq from '../components/Faq'
import Icon from '../components/Icon'
import { usePageMeta } from '../lib/seo'

export default function ServicePage({ s }: { s: Service }) {
  usePageMeta(s.seoTitle, s.seoDescription, '/' + s.slug)
  const BUSINESS = useBusiness()
  const realizace = useContent((st) => st.realizace)
  const services = useContent((st) => st.services)
  const works = realizace.filter((r) => s.kinds.includes(r.kind))
  const others = services.filter((x) => x.id !== s.id)

  return (
    <main>
      <section className="svc-hero">
        <div className="wrap svc-hero-grid">
          <div>
            <nav className="crumbs" aria-label="Drobečková navigace">
              <Link to="/">Úvod</Link><span aria-hidden>/</span><Link to="/#sluzby">Služby</Link>
            </nav>
            <h1>{s.title} v Jihlavě a na Vysočině</h1>
            <p className="lead">{s.description}</p>
            <ul className="facts">
              {s.details.map((d) => <li key={d}><Icon name="check" size={18} /><span>{d}</span></li>)}
            </ul>
            <div className="hero-actions">
              <Link className="btn" to="/kontakt">Nezávazně poptat</Link>
              <a className="btn ghost" href={`tel:${BUSINESS.phoneTel}`}><Icon name="phone" size={18} />{BUSINESS.phoneDisplay}</a>
            </div>
          </div>
          <figure className="svc-hero-photo">
            <img src={s.image} alt={s.title} fetchPriority="high" />
          </figure>
        </div>
      </section>

      {works.length > 0 && (
        <section className="section">
          <div className="wrap">
            <header className="section-head">
              <h2>{works.length === 1 ? 'Ukázka z mé práce' : 'Ukázky z mé práce'}</h2>
              <p className="lead">Skutečné zakázky, nafocené přímo na místě. U dvojic před a po táhněte jezdcem.</p>
            </header>
            <div className={'gal' + (works.length <= 2 ? ' gal-few' : '')}>
              {works.map((r) => <GalleryCard key={r.id} r={works.length <= 2 ? { ...r, wide: false } : r} />)}
            </div>
          </div>
        </section>
      )}

      <section className="section dark">
        <div className="wrap try-band">
          <div>
            <h2>Nejdřív si to prohlédněte</h2>
            <p className="lead">Vyfoťte svou místnost a přebarvěte stěny na displeji. Návrh mi pak pošlete s poptávkou.</p>
          </div>
          <div className="try-band-actions">
            <Link className="btn light" to="/vizualizator?rezim=foto"><Icon name="camera" size={18} />Přebarvit svou fotku</Link>
            <Link className="btn ghost-light" to="/vizualizator"><Icon name="cube" size={18} />3D místnost</Link>
          </div>
        </div>
      </section>

      <Faq />

      <section className="section tint">
        <div className="wrap">
          <h2 className="others-title">Další služby</h2>
          <ul className="others">
            {others.map((o) => (
              <li key={o.id}>
                <Link to={'/' + o.slug}>
                  <img src={o.image} alt="" loading="lazy" />
                  <span><b>{o.title}</b><small>{o.short}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ContactSection />
    </main>
  )
}
