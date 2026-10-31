import { type ReactNode, Suspense, lazy, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { api, setUnauthorizedHandler } from './api'
import { I, Loading, Toasts, toastError } from './ui'
import { REALIZACE } from '../data/realizace'
import { FAQS, SERVICES } from '../data/services'
import Logo from '../components/Logo'
import './admin.css'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Inquiries = lazy(() => import('./pages/Inquiries'))
const ContentHub = lazy(() => import('./pages/ContentHub'))
const Realizace = lazy(() => import('./pages/Realizace'))
const Posts = lazy(() => import('./pages/Posts'))
const PostEditor = lazy(() => import('./pages/PostEditor'))
const Services = lazy(() => import('./pages/Services'))
const Faqs = lazy(() => import('./pages/Faqs'))
const Seo = lazy(() => import('./pages/Seo'))
const Reviews = lazy(() => import('./pages/Reviews'))
const GoogleHub = lazy(() => import('./pages/GoogleHub'))
const SearchConsole = lazy(() => import('./pages/SearchConsole'))
const Ads = lazy(() => import('./pages/Ads'))
const Settings = lazy(() => import('./pages/Settings'))

type Me = { setup: true; setupCodeConfigured: boolean } | { setup: false; user: { email: string } | null }

/** Administrace nemá být ve vyhledávačích a na telefonu se dá připnout na plochu jako aplikace. */
function useAdminHead() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Administrace | Malířství Špejtek'
    const add = (tag: string, attrs: Record<string, string>) => {
      const el = document.createElement(tag)
      for (const k in attrs) el.setAttribute(k, attrs[k])
      el.dataset.admin = '1'
      document.head.appendChild(el)
    }
    add('meta', { name: 'robots', content: 'noindex, nofollow' })
    add('link', { rel: 'manifest', href: '/admin.webmanifest' })
    add('link', { rel: 'apple-touch-icon', href: '/admin-icon-192.png' })
    add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' })
    add('meta', { name: 'mobile-web-app-capable', content: 'yes' })
    add('meta', { name: 'apple-mobile-web-app-title', content: 'Špejtek admin' })
    const vp = document.querySelector('meta[name="viewport"]')
    const prevVp = vp?.getAttribute('content') ?? ''
    vp?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')
    document.documentElement.classList.add('adm-root')
    return () => {
      document.title = prevTitle
      document.head.querySelectorAll('[data-admin]').forEach((e) => e.remove())
      vp?.setAttribute('content', prevVp)
      document.documentElement.classList.remove('adm-root')
    }
  }, [])
}

/** Při prvním přihlášení přenese současný obsah webu (realizace, služby, FAQ) do databáze. */
async function seedOnce() {
  if (sessionStorage.getItem('adm-seeded')) return
  const strip = <T extends { id: string }>(x: T) => { const { id, ...data } = x; return { id, data } }
  await api('admin/seed', {
    body: {
      realizace: REALIZACE.map(strip),
      services: SERVICES.map(strip),
      faqs: FAQS.map(([q, a]) => ({ data: { q, a } })),
    },
  })
  sessionStorage.setItem('adm-seeded', '1')
}

export default function AdminApp() {
  useAdminHead()
  const [me, setMe] = useState<Me | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const load = () => api<Me>('admin/me').then(setMe).catch((e) => setErr(e.message))
  useEffect(() => { load(); setUnauthorizedHandler(() => setMe((m) => (m && !m.setup ? { setup: false, user: null } : m))) }, [])
  useEffect(() => { if (me && !me.setup && me.user) seedOnce().catch(() => {}) }, [me])

  if (err) return <AuthShell><p className="adm-error">{err}</p><button className="adm-btn" onClick={() => { setErr(null); load() }}>Zkusit znovu</button></AuthShell>
  if (!me) return <AuthShell><Loading /></AuthShell>
  if (me.setup) return <Setup configured={me.setupCodeConfigured} onDone={load} />
  if (!me.user) return <Login onDone={load} />
  return <Shell email={me.user.email} onLogout={() => setMe({ setup: false, user: null })} />
}

/* ───────── přihlášení ───────── */
function AuthShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="adm-auth">
      <div className="adm-auth-card">
        <div className="adm-brand"><Logo /><span>Špejtek<small>administrace</small></span></div>
        {title && <h1>{title}</h1>}
        {children}
      </div>
      <Toasts />
    </div>
  )
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try { await api('admin/login', { body: { email, password } }); onDone() } catch (x) { setError((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <AuthShell title="Přihlášení">
      <form className="adm-form" onSubmit={submit}>
        <label className="adm-field"><span className="adm-label">Přihlašovací jméno</span>
          <input autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="adm-field"><span className="adm-label">Heslo</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="adm-btn block" disabled={busy}>{busy ? 'Přihlašuji…' : 'Přihlásit se'}</button>
        <p className="adm-hint">Přihlášení vydrží 30 dní na tomto zařízení.</p>
      </form>
    </AuthShell>
  )
}

function Setup({ configured, onDone }: { configured: boolean; onDone: () => void }) {
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try { await api('admin/setup', { body: { code, email, password } }); onDone() } catch (x) { setError((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <AuthShell title="Založení účtu">
      {!configured ? (
        <div className="adm-note">
          <p>Na serveru zatím není nastavený instalační kód. Spusťte ve složce projektu:</p>
          <code>npx wrangler secret put ADMIN_SETUP_CODE</code>
          <p>a pak tuto stránku obnovte.</p>
        </div>
      ) : (
        <form className="adm-form" onSubmit={submit}>
          <p className="adm-hint">Jednorázově založte účet majitele. Instalační kód je hodnota <code>ADMIN_SETUP_CODE</code> ze serveru.</p>
          <label className="adm-field"><span className="adm-label">Instalační kód</span>
            <input autoComplete="off" required value={code} onChange={(e) => setCode(e.target.value)} /></label>
          <label className="adm-field"><span className="adm-label">Přihlašovací jméno (nebo e-mail)</span>
            <input autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="adm-field"><span className="adm-label">Heslo (aspoň 10 znaků)</span>
            <input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p className="adm-error" role="alert">{error}</p>}
          <button className="adm-btn block" disabled={busy}>{busy ? 'Zakládám…' : 'Založit účet a přihlásit'}</button>
        </form>
      )}
    </AuthShell>
  )
}

/* ───────── rozvržení ───────── */
const NAV = [
  { to: '/admin', icon: 'home', label: 'Přehled', end: true, mobile: true },
  { to: '/admin/poptavky', icon: 'inbox', label: 'Poptávky', mobile: true },
  { to: '/admin/obsah', icon: 'layers', label: 'Obsah', mobile: true, match: ['/admin/obsah', '/admin/recenze', '/admin/realizace', '/admin/aktuality', '/admin/sluzby', '/admin/dotazy', '/admin/seo'] },
  { to: '/admin/google', icon: 'chart', label: 'Google', mobile: true, match: ['/admin/google', '/admin/search-console', '/admin/reklamy'] },
  { to: '/admin/nastaveni', icon: 'settings', label: 'Nastavení', mobile: true },
]
const SUB = [
  { to: '/admin/recenze', icon: 'star', label: 'Recenze' },
  { to: '/admin/realizace', icon: 'photo', label: 'Realizace' },
  { to: '/admin/aktuality', icon: 'doc', label: 'Aktuality' },
  { to: '/admin/sluzby', icon: 'wrench', label: 'Služby' },
  { to: '/admin/dotazy', icon: 'help', label: 'Časté dotazy' },
  { to: '/admin/seo', icon: 'globe', label: 'SEO stránek' },
  { to: '/admin/search-console', icon: 'search', label: 'Search Console' },
  { to: '/admin/reklamy', icon: 'megaphone', label: 'Google Ads' },
]

function Shell({ email, onLogout }: { email: string; onLogout: () => void }) {
  const { pathname } = useLocation()
  const [newCount, setNewCount] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  useEffect(() => {
    api<{ newInquiries: number; pendingReviews?: number }>('admin/stats').then((s) => { setNewCount(s.newInquiries); setReviewCount(s.pendingReviews ?? 0) }).catch(() => {})
  }, [pathname])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const logout = async () => {
    try { await api('admin/logout', { body: {} }) } catch (e) { toastError(e) }
    onLogout()
  }
  const isActive = (n: (typeof NAV)[number]) => n.match ? n.match.some((m) => pathname.startsWith(m)) : n.end ? pathname === n.to || pathname === n.to + '/' : pathname.startsWith(n.to)

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand"><Logo /><span>Špejtek<small>administrace</small></span></div>
        <nav aria-label="Administrace">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={isActive(n) ? 'active' : ''}>
              <I n={n.icon} />{n.label}{n.to === '/admin/poptavky' && newCount > 0 && <span className="adm-badge">{newCount}</span>}
            </NavLink>
          ))}
          <hr />
          {SUB.map((n) => <NavLink key={n.to} to={n.to} className="sub"><I n={n.icon} s={20} />{n.label}{n.to === '/admin/recenze' && reviewCount > 0 && <span className="adm-badge">{reviewCount}</span>}</NavLink>)}
        </nav>
        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noopener"><I n="external" s={18} />Otevřít web</a>
          <button onClick={logout}><I n="logout" s={18} />Odhlásit <small>{email}</small></button>
        </div>
      </aside>

      <main className="adm-main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/poptavky" element={<Inquiries />} />
            <Route path="/admin/poptavky/:id" element={<Inquiries />} />
            <Route path="/admin/obsah" element={<ContentHub />} />
            <Route path="/admin/realizace" element={<Realizace />} />
            <Route path="/admin/aktuality" element={<Posts />} />
            <Route path="/admin/aktuality/:id" element={<PostEditor />} />
            <Route path="/admin/sluzby" element={<Services />} />
            <Route path="/admin/dotazy" element={<Faqs />} />
            <Route path="/admin/seo" element={<Seo />} />
            <Route path="/admin/recenze" element={<Reviews />} />
            <Route path="/admin/recenze/:id" element={<Reviews />} />
            <Route path="/admin/google" element={<GoogleHub />} />
            <Route path="/admin/search-console" element={<SearchConsole />} />
            <Route path="/admin/reklamy" element={<Ads />} />
            <Route path="/admin/nastaveni" element={<Settings onLogout={logout} email={email} />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </main>

      <nav className="adm-tabs" aria-label="Hlavní navigace">
        {NAV.filter((n) => n.mobile).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={isActive(n) ? 'active' : ''}>
            <span className="adm-tab-icon"><I n={n.icon} />{n.to === '/admin/poptavky' && newCount > 0 && <span className="adm-badge">{newCount}</span>}{n.to === '/admin/obsah' && reviewCount > 0 && <span className="adm-badge">{reviewCount}</span>}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <Toasts />
    </div>
  )
}
