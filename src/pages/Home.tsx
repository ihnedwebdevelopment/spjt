import Hero from '../components/Hero'
import FinishLab from '../components/FinishLab'
import ContactSection from '../components/ContactSection'
import Faq from '../components/Faq'
import Reviews from '../components/Reviews'
import { Gallery, Process, Services, Visualizer } from '../components/Sections'
import { usePageMeta } from '../lib/seo'
import { LatestPosts } from './PostsPage'

export default function Home() {
  usePageMeta(
    'Malíř Jihlava a Vysočina | Malířství Špejtek',
    'Malířské a natěračské práce v Jihlavě a na Vysočině: malování bytů, dekorativní stěrky, fasády. Přebarvěte si stěnu na fotce svého pokoje a pošlete poptávku.',
    '/',
  )
  return (
    <main>
      <Hero />
      <Gallery />
      <Services />
      <FinishLab />
      <Visualizer />
      <Process />
      <Reviews />
      <LatestPosts />
      <Faq />
      <ContactSection />
    </main>
  )
}
