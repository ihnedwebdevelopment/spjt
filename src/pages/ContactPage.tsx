import ContactSection from '../components/ContactSection'
import { usePageMeta } from '../lib/seo'

export default function ContactPage() {
  usePageMeta('Kontakt a nezávazná poptávka | Malířství Špejtek', 'Zavolejte na 602 581 542 nebo pošlete SMS s fotkami místnosti. Nezávazná nabídka zdarma, obvykle do dvou dnů. Jihlava a celá Vysočina.', '/kontakt')
  return (
    <main>
      <ContactSection standalone />
    </main>
  )
}
