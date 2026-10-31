import Reviews from '../components/Reviews'
import { usePageMeta } from '../lib/seo'

/** /recenze – odkaz, který lze poslat zákazníkovi po dokončené zakázce (formulář je rovnou otevřený). */
export default function ReviewsPage() {
  usePageMeta(
    'Recenze zákazníků | Malířství Špejtek',
    'Zkušenosti zákazníků s malováním bytů, stěrkami a fasádami od Malířství Špejtek v Jihlavě a na Vysočině. Napište i vy svou recenzi.',
    '/recenze',
  )
  return (
    <main>
      <Reviews standalone />
    </main>
  )
}
