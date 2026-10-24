import type { SurfaceStyle } from '../store/types'

const st = (hex: string, texture: SurfaceStyle['texture'] = 'none', finish: SurfaceStyle['finish'] = 'matte'): SurfaceStyle => ({ hex, texture, finish })

export interface HeroLook {
  name: string
  swatch: string
  walls: SurfaceStyle
  accent: SurfaceStyle
  ceiling: SurfaceStyle
}

export const HERO_LOOKS: HeroLook[] = [
  { name: 'Šalvějová s petrolejovým akcentem', swatch: '#a7b79a', walls: st('#a7b79a'), accent: st('#2f6b72'), ceiling: st('#f6f4ee') },
  { name: 'Terakota a broskvový květ', swatch: '#c0674a', walls: st('#f1cdb0'), accent: st('#c0674a'), ceiling: st('#f6f4ee') },
  { name: 'Betonová stěrka', swatch: '#8d8d89', walls: st('#b4b3ae', 'concrete'), accent: st('#8a8985', 'concrete'), ceiling: st('#e9e5d9') },
  { name: 'Ledová modř a půlnoční akcent', swatch: '#9dc3dc', walls: st('#cfe0ea'), accent: st('#1f2f52'), ceiling: st('#f6f4ee') },
  { name: 'Smetanová se Špejtek modrou', swatch: '#2457ff', walls: st('#efe6d2'), accent: st('#2457ff', 'none', 'satin'), ceiling: st('#f6f4ee') },
  { name: 'Zlatá stěrka na akcentu', swatch: '#cfa84e', walls: st('#e6dcc3'), accent: st('#cfa84e', 'gold', 'satin'), ceiling: st('#f6f4ee') },
]

