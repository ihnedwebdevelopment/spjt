import { useEffect } from 'react'
import ContactSection from '../components/ContactSection'

export default function ContactPage() {
  useEffect(() => { document.title = 'Kontakt a nezávazná poptávka | Malířství Špejtek' }, [])
  return (
    <main>
      <ContactSection standalone />
    </main>
  )
}
