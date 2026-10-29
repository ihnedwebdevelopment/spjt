import { Link } from 'react-router-dom'
import ContactForm from './ContactForm'
import { useBusiness } from '../content/store'
import Icon from './Icon'

export default function ContactSection({ standalone }: { standalone?: boolean }) {
  const BUSINESS = useBusiness()
  return (
    <section className={'section tint' + (standalone ? ' page-top' : '')} id="kontakt">
      <div className="wrap contact">
        <div>
          <h2>Domluvme se na výmalbě</h2>
          <a className="phone-big" href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a>
          <p className="lead">Zavolejte, nebo pošlete SMS s pár fotkami místnosti. Ozvu se a domluvíme prohlídku.</p>
          <ul className="facts">
            <li><Icon name="check" size={18} /><span>Pracuji v Jihlavě a po celé Vysočině.</span></li>
            <li><Icon name="check" size={18} /><span>Nabídka je zdarma a nezávazná, obvykle do dvou dnů.</span></li>
            <li><Icon name="check" size={18} /><span>Cena závisí na ploše, stavu podkladu, počtu odstínů a přípravě.</span></li>
            <li><Icon name="check" size={18} /><span><Link to="/vizualizator?rezim=foto">Přebarvěte si svou fotku</Link> a pošlete mi návrh rovnou s poptávkou.</span></li>
          </ul>
        </div>
        <ContactForm />
      </div>
    </section>
  )
}
