/**
 * Kampaň Google Ads připravená ke spuštění (zobrazí se, dokud není připojený účet Ads).
 * Klíčová slova a texty vycházejí ze služeb a slibů na webu; limity Google Ads:
 * nadpis ≤ 30 znaků, popis ≤ 90 znaků, cesta ≤ 15 znaků.
 */
export interface AdGroup { name: string; headline: string; url: string; path: [string, string]; keywords: string[] }

export const PLAN = {
  campaign: 'Malíř – Jihlava, Praha, Brno, Pardubice',
  channel: 'Vyhledávání Google',
  location: 'Jihlava, Praha, Brno, Pardubice (+ okolí 20 km)',
  cities: ['Jihlava', 'Praha', 'Brno', 'Pardubice'],
  language: 'čeština',
  schedule: 'Po–So 6:00–21:00',
  bidding: 'Maximalizace konverzí (poptávka, telefonát)',
  /** celkový rozpočet a období kampaně */
  totalBudget: 8500,
  months: 6,
  /** 8 500 Kč / (6 × 30,4 dne) ≈ 46,6 Kč → 46 Kč, aby se celková částka nepřekročila */
  dailyBudget: 46,
  /** orientační cena za proklik u malířských služeb (Praha a Brno jsou dražší než Jihlava) (Kč) */
  cpc: [12, 30] as [number, number],
  conversions: ['Odeslaná poptávka z webu', 'Klik na telefon 602 581 542'],
  headlines: [
    'Jihlava, Praha, Brno',
    'Pardubice a okolí',
    'Malování bytů a domů',
    'Nabídka zdarma do 2 dnů',
    'Přímo s řemeslníkem',
    'Vyzkoušejte barvu na fotce',
    'Dekorativní stěrky',
    'Benátský štuk a beton',
    'Fasády a sokly',
    'Zakrytí nábytku a úklid',
    'Opravy zdí před malováním',
    'Volejte 602 581 542',
    'Malířství Špejtek',
  ],
  descriptions: [
    'Výmalby bytů, domů i firem v Jihlavě, Praze, Brně a Pardubicích. Nabídka zdarma.',
    'Pošlete fotky místnosti a domluvíme rozsah. Voláte přímo řemeslníkovi, ne dispečinku.',
    'Přebarvěte si stěnu na fotce svého pokoje a pošlete mi návrh rovnou s poptávkou.',
    'Betonové stěrky, benátský štuk, fasády i opravy zdí. Materiál volím podle povrchu.',
  ],
  groups: [
    { name: 'Malíř a malování', headline: 'Malíř a natěrač', url: '/malirske-prace-jihlava', path: ['malir', 'nabidka'],
      keywords: ['malíř jihlava', 'malíř praha', 'malíř brno', 'malíř pardubice', 'malířské práce', 'malířské a natěračské práce'] },
    { name: 'Malování bytů', headline: 'Malování bytů a domů', url: '/malovani-bytu-jihlava', path: ['malovani', 'bytu'],
      keywords: ['malování bytu jihlava', 'malování bytu praha', 'malování bytu brno', 'malování bytu pardubice', 'vymalování bytu cena', 'malování pokoje'] },
    { name: 'Dekorativní stěrky', headline: 'Dekorativní stěrky', url: '/dekorativni-sterky-jihlava', path: ['sterky', 'stuk'],
      keywords: ['betonová stěrka', 'betonová stěrka praha', 'benátský štuk brno', 'benátský štuk praha', 'dekorativní stěrka', 'betonová stěrka cena'] },
    { name: 'Fasády a sokly', headline: 'Nátěry fasád a soklů', url: '/fasady-jihlava', path: ['fasady', 'sokly'],
      keywords: ['nátěr fasády jihlava', 'nátěr fasády pardubice', 'malování fasády', 'nátěr soklu', 'obnova fasády'] },
    { name: 'Natěračské práce', headline: 'Natěračské práce', url: '/nateracske-prace-jihlava', path: ['natery', 'konstrukce'],
      keywords: ['natěrač jihlava', 'natěrač praha', 'natěrač brno', 'nátěr zábradlí', 'nátěr kovových konstrukcí'] },
  ] as AdGroup[],
  negatives: ['brigáda', 'práce malíř', 'nabídka práce', 'jak malovat', 'návod', 'barva prodej', 'obi', 'hornbach', 'bauhaus', 'zdarma ke stažení', 'omalovánky', 'malíř obrazů', 'kurz'],
}

/** Měsíční odhad z rozpočtu a ceny za proklik (Google utratí v průměru 30,4× denní rozpočet). */
export function estimate(daily = PLAN.dailyBudget, cpc = PLAN.cpc) {
  const month = daily * 30.4
  return { month, clicks: [Math.round(month / cpc[1] / 10) * 10, Math.round(month / cpc[0] / 10) * 10] as [number, number] }
}
