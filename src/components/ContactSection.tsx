import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import ContactForm from './ContactForm'
import { BUSINESS } from '../config'
import Icon from './Icon'

export default function ContactSection({ standalone }: { standalone?: boolean }) {
  return (
    <section className={'section tint' + (standalone ? ' page-top' : '')} id="kontakt">
      <div className="wrap contact">
        <Reveal>
          <span className="eyebrow">Kontakt</span>
          <h2>Zavolejte, <em>přímo</em> mně</h2>
          <a className="phone-big" href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a>
          <p className="lead">Bez dispečinku, bez čekání. Nebo pošlete SMS s fotkami místnosti.</p>
          <ul className="facts">
            <li><Icon name="check" size={18} /><span>{BUSINESS.area}</span></li>
            <li><Icon name="check" size={18} /><span>Nabídka zdarma a nezávazná, odpověď obvykle do dvou dnů</span></li>
            <li><Icon name="check" size={18} /><span>Cena závisí na ploše, stavu podkladu, počtu odstínů a přípravě</span></li>
            <li><Icon name="check" size={18} /><span><Link to="/vizualizator">Navrhněte si barvy ve 3D</Link> a pošlete mi je s poptávkou</span></li>
          </ul>
        </Reveal>
        <Reveal delay={0.1}><ContactForm /></Reveal>
      </div>
    </section>
  )
}
