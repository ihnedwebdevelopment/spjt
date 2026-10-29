import { Link } from 'react-router-dom'
import { useContent, type PostSummary } from '../content/store'
import { formatDate } from '../lib/markdown'
import { usePageMeta } from '../lib/seo'
import ContactSection from '../components/ContactSection'

export function PostCard({ p }: { p: PostSummary }) {
  return (
    <li className="post-card">
      <Link to={'/aktuality/' + p.slug}>
        {p.cover ? <img src={p.cover} alt="" loading="lazy" decoding="async" /> : <span className="post-card-ph" aria-hidden />}
        <span className="post-card-body">
          <time dateTime={new Date(p.publishedAt * 1000).toISOString()}>{formatDate(p.publishedAt)}</time>
          <b>{p.title}</b>
          {p.excerpt && <small>{p.excerpt}</small>}
        </span>
      </Link>
    </li>
  )
}

/** Poslední články na úvodní stránce (zobrazí se jen, když nějaké existují). */
export function LatestPosts() {
  const posts = useContent((s) => s.posts)
  if (!posts.length) return null
  return (
    <section className="section tint" id="aktuality">
      <div className="wrap">
        <header className="section-head">
          <h2>Rady a novinky</h2>
          <p className="lead">Co jsem dělal, co se osvědčilo a na co si dát pozor, když plánujete malování. <Link to="/aktuality" className="text-link">Všechny články</Link></p>
        </header>
        <ul className="posts">{posts.slice(0, 3).map((p) => <PostCard key={p.slug} p={p} />)}</ul>
      </div>
    </section>
  )
}

export default function PostsPage() {
  usePageMeta('Aktuality a rady | Malířství Špejtek', 'Novinky, rady k malování a ukázky z realizací Malířství Špejtek v Jihlavě a na Vysočině.', '/aktuality')
  const posts = useContent((s) => s.posts)
  const live = useContent((s) => s.live)
  return (
    <main>
      <section className="section page-top">
        <div className="wrap">
          <header className="section-head">
            <h1>Aktuality a rady</h1>
            <p className="lead">Zkušenosti z realizací v Jihlavě a okolí a praktické rady, jak se na malování připravit.</p>
          </header>
          {posts.length ? (
            <ul className="posts">{posts.map((p) => <PostCard key={p.slug} p={p} />)}</ul>
          ) : (
            <p className="lead">{live ? 'Zatím tu nic není, brzy přibudou první články.' : 'Načítám články…'}</p>
          )}
        </div>
      </section>
      <ContactSection />
    </main>
  )
}
