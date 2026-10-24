import leseni from '../images/hero-malir-na-leseni.webp'
import pokoj from '../images/pokoj-po.webp'
import sterka from '../images/dekorativni-sterka-detail.webp'
import sokl from '../images/sokl-fasady-po.webp'
import konstrukce from '../images/natery-konstrukci-po.webp'
import kuchyn from '../images/priprava-kuchyne.webp'

export interface Service {
  id: string
  /** adresa stránky služby – shodná se starým webem kvůli vyhledávačům */
  slug: string
  title: string
  text: string
  short: string
  description: string
  details: string[]
  image: string
  /** které realizace k službě patří (podle `kind` v realizace.ts) */
  kinds: string[]
  seoTitle: string
  seoDescription: string
}

export const SERVICES: Service[] = [
  {
    id: 'malirske', slug: 'malirske-prace-jihlava', title: 'Malířské práce', image: leseni, kinds: ['Malování'],
    text: 'Výmalby pokojů, domů a komerčních prostor – od přípravy podkladu po finální nátěr.',
    short: 'Nová barva, nová atmosféra.',
    description: 'Výmalby pokojů, domů i komerčních prostor. Od přípravy podkladu až po poslední tah válečkem. Bílé i barevné nátěry podle vašeho přání, s ochranou vybavení a kontrolou každé hrany.',
    details: ['Výmalba interiérů a komerčních prostor', 'Bílé i barevné nátěry podle vašeho přání', 'Zakrytí vybavení a příprava podkladu', 'Kontrola hran a sjednocení odstínu'],
    seoTitle: 'Malířské práce Jihlava | Malířství Špejtek',
    seoDescription: 'Malíř v Jihlavě a na Vysočině: výmalby pokojů, domů i komerčních prostor včetně přípravy podkladu. Nezávazná nabídka zdarma do dvou dnů.',
  },
  {
    id: 'byty', slug: 'malovani-bytu-jihlava', title: 'Malování bytů', image: pokoj, kinds: ['Malování'],
    text: 'Jeden pokoj nebo celý byt. Nábytek zakryji, po práci uklidím a nechám čisté zakončení.',
    short: 'Domov, do kterého se těšíte.',
    description: 'Jeden pokoj nebo celý byt. S respektem k vašemu domovu, ochranou nábytku a čistým zakončením. Postup domluvíme tak, abyste mohli doma normálně fungovat i během malování.',
    details: ['Pokoje, byty i rodinné domy', 'Ochrana podlah, nábytku a detailů', 'Drobné opravy zdí před výmalbou', 'Postup domluvený podle provozu domácnosti'],
    seoTitle: 'Malování bytů Jihlava | Malířství Špejtek',
    seoDescription: 'Malování bytů a rodinných domů v Jihlavě a okolí. Zakrytí nábytku, opravy zdí, úklid. Vyzkoušejte si barvu na fotce svého pokoje.',
  },
  {
    id: 'sterky', slug: 'dekorativni-sterky-jihlava', title: 'Dekorativní stěrky', image: sterka, kinds: ['Dekorativní stěrka'],
    text: 'Betonový vzhled, jemné struktury a benátský štuk. Povrch, který si chcete pořád prohlížet.',
    short: 'Stěna s vlastním rukopisem.',
    description: 'Betonový vzhled, jemné struktury i benátský štuk. Povrchy, které dodají interiéru osobitý charakter. Stěrky nanáším ručně v několika vrstvách a odstín vybíráme podle prostoru a světla.',
    details: ['Dekorativní betonové stěrky', 'Benátský štuk a strukturované povrchy', 'Zlaté a metalické efekty na akcentní stěnu', 'Příprava podkladu a ruční zpracování'],
    seoTitle: 'Dekorativní stěrky a benátský štuk Jihlava | Malířství Špejtek',
    seoDescription: 'Betonové stěrky, benátský štuk a zlaté dekorativní povrchy v Jihlavě a na Vysočině. Ruční zpracování, ukázky skutečných realizací.',
  },
  {
    id: 'fasady', slug: 'fasady-jihlava', title: 'Fasády a sokly', image: sokl, kinds: ['Fasády'],
    text: 'Obnova fasád, soklů a venkovních detailů, které vydrží počasí na Vysočině.',
    short: 'Dobrý dojem začíná zvenku.',
    description: 'Obnova fasád, soklů a venkovních detailů. Vhodný postup i materiál podle skutečného stavu domu, orientace a podkladu – aby nátěr vydržel vysočinské zimy.',
    details: ['Nátěry fasád a soklů', 'Posouzení stavu venkovního podkladu', 'Příprava a opravy vhodných povrchů', 'Obnova detailů a sjednocení vzhledu'],
    seoTitle: 'Nátěry fasád a soklů Jihlava | Malířství Špejtek',
    seoDescription: 'Obnova a nátěry fasád a soklů v Jihlavě a na Vysočině. Posouzení podkladu, vhodný fasádní systém, ukázky před a po.',
  },
  {
    id: 'natery', slug: 'nateracske-prace-jihlava', title: 'Natěračské práce', image: konstrukce, kinds: ['Natěračské práce'],
    text: 'Nátěry kovu, dřeva a konstrukcí, včetně atik a zábradlí.',
    short: 'Krása i ochrana povrchu.',
    description: 'Nátěry kovu, dřeva a konstrukcí. Pečlivá obnova povrchů, které potřebují znovu sloužit a dobře vypadat – od zábradlí po atiku na střeše.',
    details: ['Nátěry kovových a dřevěných povrchů', 'Zábradlí, konstrukce, atiky', 'Příprava před novým nátěrem', 'Materiál zvolený podle namáhání povrchu'],
    seoTitle: 'Natěračské práce Jihlava | Malířství Špejtek',
    seoDescription: 'Nátěry kovu, dřeva, konstrukcí, zábradlí a atik v Jihlavě a okolí. Správná příprava a materiál podle použití.',
  },
  {
    id: 'opravy', slug: 'opravy-zdi-jihlava', title: 'Opravy zdí', image: kuchyn, kinds: ['Opravy zdí'],
    text: 'Tmelení, broušení, penetrace a řešení prasklin – základ, na kterém barva drží.',
    short: 'Pevný základ dobrého výsledku.',
    description: 'Praskliny, nerovnosti a staré vrstvy. Tmelení, broušení a penetrace pro hladký a sjednocený povrch, na kterém nová barva vydrží a vypadá dobře.',
    details: ['Opravy prasklin, děr a nerovností', 'Tmelení a broušení povrchů', 'Penetrace před finální výmalbou', 'Posouzení rozsahu oprav na místě'],
    seoTitle: 'Opravy zdí a příprava podkladu Jihlava | Malířství Špejtek',
    seoDescription: 'Opravy prasklin, tmelení, broušení a penetrace zdí před malováním. Jihlava a celá Vysočina.',
  },
]

/** Postup spolupráce – skutečné pořadí kroků. */
export const PROCESS = [
  { title: 'Ozvěte se', text: 'Stačí pár fotek, místo a přibližná velikost plochy. Nebo rovnou zavolejte a popište to vlastními slovy.', points: ['Telefon, SMS i formulář', 'Odpověď obvykle do dvou dnů'] },
  { title: 'Domluvíme rozsah', text: 'Upřesníme postup, materiál i termín. U větších zakázek se přijedu podívat a změřím skutečný stav.', points: ['Prohlídka na místě zdarma', 'Rozsah i cena písemně'] },
  { title: 'Připravím prostor', text: 'Zakryji podlahy a nábytek, ochráním hrany a detaily. Podklad opravím, přebrousím a napenetruji.', points: ['Ochrana vybavení a podlah', 'Denní úklid pracoviště'] },
  { title: 'Namaluji a předám', text: 'Natřu, zkontroluji hrany i přechody a prostor předám uklizený. Výsledek si projdeme společně.', points: ['Kontrola odstínu i detailů', 'Společné převzetí na místě'] },
]

/** Na co se zákazník může spolehnout. */
export const PROMISES = [
  { title: 'Cena, na kterou se spolehnete', text: 'Rozsah i částku si odsouhlasíme předem. Když se během práce něco změní, ozvu se dřív, než to udělám.' },
  { title: 'Jeden člověk, se kterým mluvíte', text: 'Domlouváte se přímo s řemeslníkem, který u vás bude pracovat.' },
  { title: 'Váš domov zůstane váš', text: 'Zakrývám, uklízím a pracuji tak, abyste doma mohli normálně fungovat i během zakázky.' },
  { title: 'Materiál podle povrchu', text: 'Barvu i systém volím podle podkladu a provozu místnosti, ne podle toho, co zrovna zbylo ve skladu.' },
  { title: 'Detaily rozhodují', text: 'Hrany, přechody, rámy a sokly kontroluji na světle i proti světlu, dokud nejsou čisté.' },
  { title: 'Když něco nesedí, opravím to', text: 'Při předání si výsledek projdeme společně. Co se vám nebude líbit, doladím.' },
]

export const FAQS: [string, string][] = [
  ['Kolik bude malování stát?', 'Cena záleží na velikosti plochy, stavu podkladu, počtu odstínů a rozsahu přípravy. Pošlete fotky a stručný popis – rozsah upřesníme a připravím nezávaznou nabídku. Orientační plochu i spotřebu barvy vám spočítá 3D vizualizátor.'],
  ['Musím před malováním všechno vystěhovat?', 'Ne. Přesunutí vybavení domluvíme podle konkrétní zakázky. Podlahy, nábytek a detaily před prací zakryji.'],
  ['Opravíte i popraskané a nerovné zdi?', 'Ano. Podle stavu podkladu řeším praskliny, díry, tmelení, broušení i penetraci před finální výmalbou.'],
  ['Pracujete i mimo Jihlavu?', 'Ano, jezdím do okolí Jihlavy a podle rozsahu zakázky i do dalších částí Vysočiny. Místo a termín spolu domluvíme.'],
  ['Děláte betonové stěrky a benátský štuk?', 'Ano. Vhodný povrch, strukturu a odstín vybereme podle prostoru, světla a výsledku, který chcete.'],
  ['Jak moc odpovídá barva na fotce skutečnosti?', 'Přebarvení fotky zachová stíny i světlo, takže dobře ukáže, jak bude místnost působit. Displeje ale barvy zkreslují, proto finální odstín vždy ověříme vzorníkem přímo u vás.'],
]

/** Fakta pod úvodem – jen ověřené věci. */
export const TRUST = [
  { k: 'Přímo s řemeslníkem', v: 'Bez dispečinku, voláte mně' },
  { k: 'Nabídka zdarma', v: 'Odpověď obvykle do dvou dnů' },
  { k: 'Náhled předem', v: 'Na vaší fotce i ve 3D' },
  { k: 'Jihlava a Vysočina', v: 'Byty, domy i firmy' },
]
