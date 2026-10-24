export type Finish = 'matte' | 'satin' | 'gloss'
export type Texture = 'none' | 'concrete' | 'venetian' | 'gold'

export interface Paint {
  id: string
  name: string
  hex: string
  group: 'Neutrální' | 'Teplé' | 'Chladné' | 'Zemité' | 'Výrazné'
}

/** Vlastní kurátorský výběr – není to katalog žádného výrobce, finální odstín se vždy ověřuje vzorníkem. */
export const PAINTS: Paint[] = [
  { id: 'bila', name: 'Čistá bílá', hex: '#f6f4ee', group: 'Neutrální' },
  { id: 'smetana', name: 'Smetanová', hex: '#efe6d2', group: 'Neutrální' },
  { id: 'sloni', name: 'Slonová kost', hex: '#e6dcc3', group: 'Neutrální' },
  { id: 'perlova', name: 'Perlově šedá', hex: '#d3d3cf', group: 'Neutrální' },
  { id: 'kamenna', name: 'Kamenná šedá', hex: '#a9a8a2', group: 'Neutrální' },
  { id: 'grafit', name: 'Grafit', hex: '#4a4d52', group: 'Neutrální' },
  { id: 'broskev', name: 'Broskvový květ', hex: '#f1cdb0', group: 'Teplé' },
  { id: 'pisek', name: 'Pouštní písek', hex: '#d9bd96', group: 'Teplé' },
  { id: 'med', name: 'Medová', hex: '#e0b256', group: 'Teplé' },
  { id: 'terakota', name: 'Terakota', hex: '#c0674a', group: 'Teplé' },
  { id: 'cihla', name: 'Pálená cihla', hex: '#9a4a3a', group: 'Teplé' },
  { id: 'ledova', name: 'Ledová modř', hex: '#cfe0ea', group: 'Chladné' },
  { id: 'nebeska', name: 'Nebeská', hex: '#9dc3dc', group: 'Chladné' },
  { id: 'petrolej', name: 'Petrolejová', hex: '#2f6b72', group: 'Chladné' },
  { id: 'noc', name: 'Půlnoční modrá', hex: '#1f2f52', group: 'Chladné' },
  { id: 'saldej', name: 'Šalvějová', hex: '#a7b79a', group: 'Zemité' },
  { id: 'oliva', name: 'Olivová', hex: '#7b8051', group: 'Zemité' },
  { id: 'les', name: 'Lesní zeleň', hex: '#2f4a3a', group: 'Zemité' },
  { id: 'kakao', name: 'Kakaová', hex: '#7a5a48', group: 'Zemité' },
  { id: 'spejtek', name: 'Špejtek modrá', hex: '#2457ff', group: 'Výrazné' },
  { id: 'malina', name: 'Malinová', hex: '#b8325a', group: 'Výrazné' },
  { id: 'slunecnice', name: 'Slunečnicová', hex: '#f2c230', group: 'Výrazné' },
  { id: 'fialova', name: 'Švestková', hex: '#5d3b66', group: 'Výrazné' },
]

export const PAINT_BY_ID = Object.fromEntries(PAINTS.map((p) => [p.id, p])) as Record<string, Paint>

export const FINISHES: { id: Finish; label: string; roughness: number; hint: string }[] = [
  { id: 'matte', label: 'Matná', roughness: 0.95, hint: 'Skryje drobné nerovnosti, klasika do obýváků a ložnic.' },
  { id: 'satin', label: 'Saténová', roughness: 0.5, hint: 'Lépe se čistí, vhodná do kuchyní a chodeb.' },
  { id: 'gloss', label: 'Pololesklá', roughness: 0.25, hint: 'Pro oblasti s častým otíráním – ukáže ale každou nerovnost.' },
]

export const TEXTURES: { id: Texture; label: string; hint: string }[] = [
  { id: 'none', label: 'Hladká', hint: 'Klasická výmalba.' },
  { id: 'concrete', label: 'Betonová stěrka', hint: 'Industriální vzhled s jemnými mráčky.' },
  { id: 'venetian', label: 'Benátský štuk', hint: 'Hladký, hluboký, jemně lesklý povrch.' },
  { id: 'gold', label: 'Zlatá stěrka', hint: 'Dekorativní kovový efekt na akcentovou stěnu.' },
]
