import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import { BUSINESS } from '../config'

export default function Header() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.classList.toggle('menu-open', open)
  }, [open])

  const solid = scrolled || pathname !== '/'
  return (
    <header className={'header' + (solid ? ' solid' : '') + (open ? ' is-open' : '')}>
      <div className="wrap">
        <Link to="/" className="logo" aria-label={BUSINESS.name + ' – úvod'}>
          <Logo />
          <span className="logo-text">Špejtek<small>Malířství &amp; natěračství</small></span>
        </Link>
        <nav className={'nav' + (open ? ' open' : '')} aria-label="Hlavní menu">
          <Link to="/#sluzby">Služby</Link>
          <Link to="/#realizace">Realizace</Link>
          <NavLink to="/vizualizator">3D vizualizátor</NavLink>
          <Link to="/#pristup">Postup</Link>
          <NavLink to="/kontakt">Kontakt</NavLink>
          <a className="nav-phone" href={`tel:${BUSINESS.phoneTel}`}><Icon name="phone" size={16} />{BUSINESS.phoneDisplay}</a>
          <Link className="cta" to="/kontakt">Poptat zakázku</Link>
        </nav>
        <button className="burger" aria-label={open ? 'Zavřít menu' : 'Otevřít menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span /><span />
        </button>
      </div>
    </header>
  )
}
