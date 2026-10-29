import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useContent } from '../content/store'
import { formatDate, markdownToHtml, readingMinutes } from '../lib/markdown'
import { usePageMeta } from '../lib/seo'
import ContactSection from '../components/ContactSection'
import { PostCard } from './PostsPage'

interface Post {
  slug: string
  title: string
  excerpt: string
  cover: string | null
  body: string
  publishedAt: number
  updatedAt: number
  seoTitle?: string | null
  seoDescription?: string | null
}

export default function PostPage() {
  const { slug = '' } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')
  const allPosts = useContent((s) => s.posts)
  const others = useMemo(() => allPosts.filter((p) => p.slug !== slug).slice(0, 3), [allPosts, slug])

  useEffect(() => {
    let alive = true
    setState('loading')
    fetch('/api/posts/' + encodeURIComponent(slug))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((p: Post) => { if (alive) { setPost(p); setState('ok') } })
      .catch(() => { if (alive) setState('missing') })
    return () => { alive = false }
  }, [slug])

  usePageMeta(
    post ? post.seoTitle || `${post.title} | Malířství Špejtek` : 'Aktuality | Malířství Špejtek',
    post ? post.seoDescription || post.excerpt : '',
    '/aktuality/' + slug,
  )
  const html = useMemo(() => (post ? markdownToHtml(post.body) : ''), [post])

  return (
    <main>
      <article className="section page-top">
        <div className="wrap article">
          <nav className="crumbs" aria-label="Drobečková navigace">
            <Link to="/">Úvod</Link><span aria-hidden>/</span><Link to="/aktuality">Aktuality</Link>
          </nav>
          {state === 'loading' && <p className="lead">Načítám článek…</p>}
          {state === 'missing' && (
            <>
              <h1>Článek nenalezen</h1>
              <p className="lead">Možná byl přesunut nebo smazán. <Link to="/aktuality">Zpět na aktuality</Link></p>
            </>
          )}
          {state === 'ok' && post && (
            <>
              <h1>{post.title}</h1>
              <p className="article-meta">
                <time dateTime={new Date(post.publishedAt * 1000).toISOString()}>{formatDate(post.publishedAt)}</time>
                <span aria-hidden>·</span>{readingMinutes(post.body)} min čtení
              </p>
              {post.excerpt && <p className="lead">{post.excerpt}</p>}
              {post.cover && <figure className="article-cover"><img src={post.cover} alt="" fetchPriority="high" /></figure>}
              <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify({
                  '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.excerpt,
                  datePublished: new Date(post.publishedAt * 1000).toISOString(), dateModified: new Date(post.updatedAt * 1000).toISOString(),
                  image: post.cover ? new URL(post.cover, location.origin).toString() : undefined,
                  author: { '@type': 'Organization', name: 'Malířství Špejtek' },
                }).replace(/</g, '\\u003c') }}
              />
            </>
          )}
        </div>
      </article>
      {others.length > 0 && (
        <section className="section tint">
          <div className="wrap">
            <h2 className="others-title">Další články</h2>
            <ul className="posts">{others.map((p) => <PostCard key={p.slug} p={p} />)}</ul>
          </div>
        </section>
      )}
      <ContactSection />
    </main>
  )
}
