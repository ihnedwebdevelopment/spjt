import betonovaSterka from '../images/betonova-sterka-seda.webp'
import zlataSterka from '../images/zlata-dekorativni-sterka.webp'
import interier from '../images/interier-po.webp'
import interierPred from '../images/interier-pred.webp'
import pokojPred from '../images/pokoj-pred.webp'
import pokojPo from '../images/pokoj-po.webp'
import soklPred from '../images/sokl-fasady-pred.webp'
import soklPo from '../images/sokl-fasady-po.webp'
import atika from '../images/nater-atiky-vyhled.webp'
import kuchyn from '../images/priprava-kuchyne.webp'
import strop from '../images/jemna-struktura-strop.webp'
import konstrukcePred from '../images/natery-konstrukci-pred.webp'
import konstrukcePo from '../images/natery-konstrukci-po.webp'

export interface Realizace {
  id: string
  title: string
  kind: string
  /** Hlavní fotka (u před/po je to stav „po“). */
  image: string
  /** Volitelná fotka stavu „před“ – karta pak ukáže posuvník před/po. */
  before?: string
  /** Kam fotku zaostřit při ořezu (CSS object-position). */
  focus?: string
  /** Široká karta přes dva sloupce. */
  wide?: boolean
  /** Místo zakázky (volitelné, doplňuje se v administraci). */
  place?: string
  /** Krátký popis (volitelné). */
  text?: string
}

export const REALIZACE: Realizace[] = [
  { id: 'seda-sterka', title: 'Šedá betonová stěrka', kind: 'Dekorativní stěrka', image: betonovaSterka },
  { id: 'zlata-sterka', title: 'Zlatá dekorativní stěrka', kind: 'Dekorativní stěrka', image: zlataSterka, focus: '50% 35%' },
  { id: 'vymalba', title: 'Výmalba interiéru', kind: 'Malování', image: interier, before: interierPred, wide: true, focus: '50% 40%' },
  { id: 'fasada', title: 'Obnova fasády a soklu', kind: 'Fasády', image: soklPo, before: soklPred, wide: true, focus: '50% 60%' },
  { id: 'atika', title: 'Nátěr atiky', kind: 'Natěračské práce', image: atika, focus: '50% 70%' },
  { id: 'pokoj', title: 'Žlutý pokoj', kind: 'Malování', image: pokojPo, before: pokojPred, wide: true },
  { id: 'kuchyn', title: 'Příprava kuchyně', kind: 'Opravy zdí', image: kuchyn },
  { id: 'strop', title: 'Dekorativní povrch stropu', kind: 'Dekorativní stěrka', image: strop, focus: '50% 40%' },
  { id: 'konstrukce', title: 'Nátěry konstrukcí', kind: 'Natěračské práce', image: konstrukcePo, before: konstrukcePred },
]
