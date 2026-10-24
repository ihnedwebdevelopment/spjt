import { useEffect } from 'react'
import Hero from '../components/Hero'
import FinishLab from '../components/FinishLab'
import ContactSection from '../components/ContactSection'
import { Gallery, Process, Services, Visualizer } from '../components/Sections'

export default function Home() {
  useEffect(() => {
    document.title = 'Malířství Špejtek – malíř Jihlava a Vysočina | 3D náhled výmalby'
  }, [])
  return (
    <main>
      <Hero />
      <Services />
      <Gallery />
      <FinishLab />
      <Visualizer />
      <Process />
      <ContactSection />
    </main>
  )
}
