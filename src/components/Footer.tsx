import { Link } from 'react-router-dom'
import Logo from './Logo'
import { BUSINESS } from '../config'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="logo"><Logo /><span className="logo-text">Špejtek<small>Malířství &amp; natěračství</small></span></div>
            <p>Malíř a natěrač z Jihlavy. Byty, domy, fasády a dekorativní stěrky po celé Vysočině.</p>
          </div>
          <div>
            <h4>Malování</h4>
            <ul>
              <li><Link to="/malirske-prace-jihlava">Malířské práce</Link></li>
              <li><Link to="/malovani-bytu-jihlava">Malování bytů</Link></li>
              <li><Link to="/dekorativni-sterky-jihlava">Dekorativní stěrky</Link></li>
            </ul>
          </div>
          <div>
            <h4>Venku a opravy</h4>
            <ul>
              <li><Link to="/fasady-jihlava">Fasády a sokly</Link></li>
              <li><Link to="/nateracske-prace-jihlava">Natěračské práce</Link></li>
              <li><Link to="/opravy-zdi-jihlava">Opravy zdí</Link></li>
            </ul>
          </div>
          <div>
            <h4>Kontakt</h4>
            <ul>
              <li><a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a></li>
              <li><Link to="/vizualizator">Vyzkoušet barvy</Link></li>
              <li><Link to="/#pristup">O mně</Link></li>
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
