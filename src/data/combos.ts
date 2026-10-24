import type { SurfaceStyle } from '../store/types'

const s = (hex: string, finish: SurfaceStyle['finish'] = 'matte', texture: SurfaceStyle['texture'] = 'none'): SurfaceStyle => ({ hex, finish, texture })

export interface Combo {
  id: string
  name: string
  note: string
  base: SurfaceStyle
  accent: SurfaceStyle
  ceiling: SurfaceStyle
  trim: SurfaceStyle
}

/** Ověřené kombinace – rychlý start pro zákazníky, kteří nevědí, kde začít. */
export const COMBOS: Combo[] = [
  { id: 'salvej', name: 'Klidná šalvěj', note: 'Uklidňující zelená do obýváku i ložnice', base: s('#efe6d2'), accent: s('#a7b79a'), ceiling: s('#f6f4ee'), trim: s('#f6f4ee', 'satin') },
  { id: 'terakota', name: 'Teplá terakota', note: 'Útulná, hřejivá, sluší dřevu', base: s('#f1cdb0'), accent: s('#c0674a'), ceiling: s('#f6f4ee'), trim: s('#f6f4ee', 'satin') },
  { id: 'sever', name: 'Severská světlá', note: 'Vzdušná, opticky zvětší místnost', base: s('#f6f4ee'), accent: s('#d3d3cf'), ceiling: s('#f6f4ee'), trim: s('#f6f4ee', 'satin') },
  { id: 'petrolej', name: 'Hluboká petrolej', note: 'Výrazná akcentní stěna, elegantní kontrast', base: s('#e6dcc3'), accent: s('#2f6b72'), ceiling: s('#f6f4ee'), trim: s('#f6f4ee', 'satin') },
  { id: 'noc', name: 'Půlnoční akcent', note: 'Moderní a odvážná, do pracovny i ložnice', base: s('#efe6d2'), accent: s('#1f2f52'), ceiling: s('#f6f4ee'), trim: s('#efe6d2', 'satin') },
  { id: 'loft', name: 'Betonový loft', note: 'Betonová stěrka na akcentu, neutrální okolí', base: s('#d3d3cf'), accent: s('#a9a8a2', 'matte', 'concrete'), ceiling: s('#f6f4ee'), trim: s('#4a4d52', 'satin') },
  { id: 'zlato', name: 'Zlatý detail', note: 'Zlatá stěrka jako šperk místnosti', base: s('#e6dcc3'), accent: s('#cfa84e', 'satin', 'gold'), ceiling: s('#f6f4ee'), trim: s('#f6f4ee', 'satin') },
  { id: 'les', name: 'Lesní ticho', note: 'Tmavá zeleň s krémovou, přírodní a klidná', base: s('#efe6d2'), accent: s('#2f4a3a'), ceiling: s('#f6f4ee'), trim: s('#efe6d2', 'satin') },
]
