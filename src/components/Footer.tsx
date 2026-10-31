import { Link } from 'react-router-dom'
import Logo from './Logo'
import { useBusiness, useContent } from '../content/store'

export default function Footer() {
  const BUSINESS = useBusiness()
  const services = useContent((s) => s.services)
  const hasPosts = useContent((s) => s.posts.length > 0)
  const half = Math.ceil(services.length / 2)
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="logo"><Logo /><span className="logo-text">Špejtek<small>Malířství &amp; natěračství</small></span></div>
            <p>Malíř a natěrač z Jihlavy. Byty, domy, fasády a dekorativní stěrky po celé Vysočině.</p>
          </div>
          <div>
            <h4>Služby</h4>
            <ul>
              {services.slice(0, half).map((s) => <li key={s.id}><Link to={'/' + s.slug}>{s.title}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4>A další</h4>
            <ul>
              {services.slice(half).map((s) => <li key={s.id}><Link to={'/' + s.slug}>{s.title}</Link></li>)}
              {hasPosts && <li><Link to="/aktuality">Aktuality a rady</Link></li>}
            </ul>
          </div>
          <div>
            <h4>Kontakt</h4>
            <ul>
              <li><a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a></li>
              <li><Link to="/vizualizator">Vyzkoušet barvy</Link></li>
              <li><Link to="/#pristup">O mně</Link></li>
              <li><Link to="/recenze">Recenze zákazníků</Link></li>
              <li>{BUSINESS.area}</li>
              <li><Link to="/kontakt">Nezávazná poptávka</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-word" aria-hidden>Špejtek</div>
        <p className="copy"><span>© {BUSINESS.year} {BUSINESS.name}</span><a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a></p>
      </div>
    </footer>
  )
}
