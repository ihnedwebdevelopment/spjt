import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import ContactPage from './pages/ContactPage'
import ServicePage from './pages/ServicePage'
import { useContent } from './content/store'
import PostsPage from './pages/PostsPage'
import ReviewsPage from './pages/ReviewsPage'

const Designer = lazy(() => import('./pages/Designer'))
const PostPage = lazy(() => import('./pages/PostPage'))
const AdminApp = lazy(() => import('./admin/AdminApp'))

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80)
      return () => clearTimeout(t)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  const services = useContent((s) => s.services)
  const designer = pathname.startsWith('/vizualizator')
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <Suspense fallback={<div className="adm-boot">Načítám administraci…</div>}>
        <AdminApp />
      </Suspense>
    )
  }
  return (
    <>
      <ScrollManager />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kontakt" element={<ContactPage />} />
        <Route path="/recenze" element={<ReviewsPage />} />
        {services.map((s) => <Route key={s.slug} path={'/' + s.slug} element={<ServicePage s={s} />} />)}
        <Route
          path="/vizualizator"
          element={
            <Suspense fallback={<div className="page-top wrap">Načítám vizualizátor…</div>}>
              <Designer />
            </Suspense>
          }
        />
        <Route path="/aktuality" element={<PostsPage />} />
        <Route
          path="/aktuality/:slug"
          element={<Suspense fallback={<div className="page-top wrap">Načítám článek…</div>}><PostPage /></Suspense>}
        />
        <Route path="*" element={<Home />} />
      </Routes>
      {!designer && <Footer />}
    </>
  )
}
