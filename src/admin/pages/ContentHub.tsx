import { Link } from 'react-router-dom'
import { I, PageHead } from '../ui'

const LINKS = [
  { to: '/admin/realizace', icon: 'photo', title: 'Realizace', text: 'Fotky zakázek, dvojice před / po, pořadí v galerii' },
  { to: '/admin/aktuality', icon: 'doc', title: 'Aktuality a rady', text: 'Články na web – pomáhají být vidět ve vyhledávání' },
  { to: '/admin/sluzby', icon: 'wrench', title: 'Služby', text: 'Texty, fotky a SEO stránek jednotlivých služeb' },
  { to: '/admin/dotazy', icon: 'help', title: 'Časté dotazy', text: 'Otázky a odpovědi zobrazené na webu' },
  { to: '/admin/seo', icon: 'globe', title: 'SEO stránek', text: 'Titulky a popisy pro Google, kontrola indexace' },
]

export default function ContentHub() {
  return (
    <div className="adm-page">
      <PageHead title="Obsah webu" sub="Změny se na webu projeví do minuty." />
      <ul className="adm-hub">
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to}>
              <span className="adm-hub-icon"><I n={l.icon} /></span>
              <span><b>{l.title}</b><small>{l.text}</small></span>
              <I n="next" s={20} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
