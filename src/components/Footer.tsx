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
            <p>Poctivé řemeslo. Pro místa, na kterých vám záleží.</p>
          </div>
          <div>
            <h4>Co děláme</h4>
            <ul>
              <li><Link to="/#sluzby">Malířské práce</Link></li>
              <li><Link to="/#sluzby">Malování bytů</Link></li>
              <li><Link to="/#sluzby">Dekorativní stěrky</Link></li>
            </ul>
          </div>
          <div>
            <h4>A také</h4>
            <ul>
              <li><Link to="/#sluzby">Fasády a sokly</Link></li>
              <li><Link to="/#sluzby">Natěračské práce</Link></li>
              <li><Link to="/#sluzby">Opravy zdí</Link></li>
            </ul>
          </div>
          <div>
            <h4>Zůstaňme v kontaktu</h4>
            <ul>
              <li><a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a></li>
              <li><Link to="/vizualizator">3D vizualizátor</Link></li>
              <li><Link to="/#pristup">Postup</Link></li>
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
