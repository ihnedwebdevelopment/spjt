import leseni from '../images/hero-malir-na-leseni.webp'
import pokoj from '../images/pokoj-po.webp'
import sterka from '../images/dekorativni-sterka-detail.webp'
import sokl from '../images/sokl-fasady-po.webp'
import konstrukce from '../images/natery-konstrukci-po.webp'
import kuchyn from '../images/priprava-kuchyne.webp'

export interface Service {
  id: string
  title: string
  text: string
  image: string
}

export const SERVICES: Service[] = [
  { id: 'malirske', title: 'Malířské práce', text: 'Výmalby pokojů, domů a komerčních prostor – od přípravy podkladu po finální nátěr.', image: leseni },
  { id: 'byty', title: 'Malování bytů', text: 'Jeden pokoj nebo celý byt. Nábytek zakryjeme, po práci uklidíme a necháme čisté zakončení.', image: pokoj },
  { id: 'sterky', title: 'Dekorativní stěrky', text: 'Betonový vzhled, jemné struktury a benátský štuk. Povrch, který si chcete pořád prohlížet.', image: sterka },
  { id: 'fasady', title: 'Fasády a sokly', text: 'Obnova fasád, soklů a venkovních detailů, které vydrží počasí na Vysočině.', image: sokl },
  { id: 'natery', title: 'Natěračské práce', text: 'Nátěry kovu, dřeva a konstrukcí, včetně atik a zábradlí.', image: konstrukce },
  { id: 'opravy', title: 'Opravy zdí', text: 'Tmelení, broušení, penetrace a řešení prasklin – základ, na kterém barva drží.', image: kuchyn },
]

export const PROCESS = [
  { title: 'Ozvěte se', text: 'Zavolejte nebo pošlete SMS s fotkami místnosti. Bez dispečinku, přímo mně.' },
  { title: 'Navrhněte si barvy', text: 'V 3D vizualizátoru si vyzkoušíte odstíny, stěrky i světlo. Návrh pošlete odkazem.' },
  { title: 'Nezávazná nabídka', text: 'Cena závisí na ploše, stavu podkladu, počtu odstínů a přípravě. Odpověď obvykle do dvou dnů.' },
  { title: 'Poctivě to namalujeme', text: 'Zakrytí, příprava, nátěr, úklid. Řemeslník, který za prací stojí.' },
]

/** Fakta do pásu důvěry pod úvodem. Jen ověřené věci – čísla (roky praxe, počet zakázek) doplňte, až je budete mít. */
export const TRUST = [
  { k: 'Přímo s řemeslníkem', v: 'Bez dispečinku, voláte mně' },
  { k: 'Nabídka zdarma', v: 'Odpověď obvykle do dvou dnů' },
  { k: '3D náhled předem', v: 'Barvy, stěrky i světlo' },
  { k: 'Jihlava a Vysočina', v: 'Byty, domy i firmy' },
]
