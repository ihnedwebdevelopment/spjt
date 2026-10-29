/**
 * Jediné místo pro firemní údaje a přepínače.
 * Výchozí hodnoty – po načtení webu je může přepsat administrace (src/content/store.ts).
 */
export const BUSINESS: {
  name: string
  tagline: string
  phoneDisplay: string
  phoneTel: string
  area: string
  email: string
  year: number
} = {
  name: 'Malířství Špejtek',
  tagline: 'Čerstvá barva. Úplně nový pocit.',
  phoneDisplay: '602 581 542',
  phoneTel: '+420602581542',
  area: 'Jihlava a celá Vysočina',
  email: '',
  year: new Date().getFullYear(),
}

/**
 * Orientační cena ve vizualizátoru. Původní web ceny nezveřejňuje,
 * proto je to ve výchozím stavu VYPNUTÉ. Zapněte až po dohodě s majitelem.
 */
export const PRICING = {
  showEstimate: false,
  pricePerM2Czk: { from: 0, to: 0 }, // doplnit, pokud showEstimate = true
} as const

/** Spotřeba: 1 litr běžné interiérové barvy vystačí na cca 10 m² na jeden nátěr. */
export const PAINT = { coverageM2PerLitre: 10, coats: 2 } as const
