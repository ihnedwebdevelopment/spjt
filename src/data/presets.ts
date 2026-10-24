import type { Design, FurnitureItem, SurfaceId, SurfaceStyle } from '../store/types'

const s = (hex: string, finish: SurfaceStyle['finish'] = 'matte', texture: SurfaceStyle['texture'] = 'none'): SurfaceStyle => ({ hex, finish, texture })

export const EXISTING_WHITE = '#e9e5d9'

export function allSurfaces(wall: SurfaceStyle, ceiling = s('#f6f4ee'), trim = s('#f6f4ee', 'satin')): Record<SurfaceId, SurfaceStyle> {
  return { wallN: wall, wallE: wall, wallS: wall, wallW: wall, ceiling, trim }
}

let uid = 0
export const newId = () => `f${Date.now().toString(36)}${(uid++).toString(36)}`

const item = (type: FurnitureItem['type'], x: number, z: number, rot: FurnitureItem['rot'], color: string): FurnitureItem => ({ id: newId(), type, x, z, rot, color })

export interface Preset {
  id: string
  label: string
  make: () => Design
}

const base = (): Pick<Design, 'before' | 'time' | 'lampsOn' | 'floor'> => ({
  before: allSurfaces(s(EXISTING_WHITE), s('#efece2'), s('#efece2')),
  time: 17.5,
  lampsOn: false,
  floor: 'oak',
})

export const PRESETS: Preset[] = [
  {
    id: 'obyvak',
    label: 'Obývací pokoj',
    make: () => ({
      ...base(),
      time: 15.5,
      room: { w: 5.2, d: 4.4, h: 2.6 },
      windowWall: 'W',
      doorWall: 'N',
      surfaces: { ...allSurfaces(s('#efe6d2')), wallN: s('#a7b79a') },
      furniture: [
        item('rug', 0.0, 0.1, 0, '#c9c1b2'),
        item('sofa', -2.0, 0.1, 1, '#3f4a5a'),
        item('tv', 2.3, 0.1, 3, '#2b2b2b'),
        item('table', 0.2, 0.2, 0, '#a98862'),
        item('shelf', -0.9, -1.95, 0, '#8d6e4b'),
        item('plant', -2.2, -1.85, 0, '#4f7a4a'),
        item('lamp', -2.15, 1.65, 0, '#e8d3a4'),
      ],
    }),
  },
  {
    id: 'loznice',
    label: 'Ložnice',
    make: () => ({
      ...base(),
      time: 10,
      room: { w: 4.0, d: 3.6, h: 2.6 },
      windowWall: 'N',
      doorWall: 'E',
      surfaces: { ...allSurfaces(s('#e6dcc3')), wallN: s('#9dc3dc'), wallW: s('#9dc3dc') },
      furniture: [
        item('bed', -0.5, -0.75, 0, '#d8d2c6'),
        item('wardrobe', -1.68, 0.95, 1, '#cfc7b8'),
        item('lamp', 0.7, -1.5, 0, '#e8d3a4'),
        item('rug', -0.5, 0.35, 0, '#b8b0a2'),
        item('plant', 1.55, 1.3, 0, '#4f7a4a'),
      ],
    }),
  },
  {
    id: 'kuchyn',
    label: 'Jídelna / kuchyň',
    make: () => ({
      ...base(),
      time: 15.5,
      floor: 'tile',
      room: { w: 4.2, d: 3.4, h: 2.6 },
      windowWall: 'N',
      doorWall: 'E',
      surfaces: { ...allSurfaces(s('#f6f4ee', 'satin')), wallW: s('#2f6b72', 'satin') },
      furniture: [
        item('table', 0.2, 0.0, 0, '#b49468'),
        item('shelf', -1.9, 0.0, 1, '#e9e5d9'),
        item('plant', 1.75, 1.2, 0, '#4f7a4a'),
      ],
    }),
  },
  {
    id: 'detsky',
    label: 'Dětský pokoj',
    make: () => ({
      ...base(),
      time: 15.5,
      room: { w: 3.6, d: 3.4, h: 2.6 },
      windowWall: 'W',
      doorWall: 'N',
      surfaces: { ...allSurfaces(s('#f1cdb0')), wallW: s('#f2c230') },
      furniture: [
        item('desk', -1.1, 0.3, 1, '#c8a97a'),
        item('shelf', 1.55, 0.2, 3, '#e9e5d9'),
        item('rug', 0.2, 0.2, 0, '#7da6c9'),
        item('plant', 1.4, 1.3, 0, '#4f7a4a'),
      ],
    }),
  },
  {
    id: 'prazdna',
    label: 'Prázdná místnost',
    make: () => ({
      ...base(),
      time: 15.5,
      room: { w: 4.5, d: 4.0, h: 2.6 },
      windowWall: 'W',
      doorWall: 'N',
      surfaces: allSurfaces(s('#efe6d2')),
      furniture: [],
    }),
  },
]

export const DEFAULT_PRESET = PRESETS[0]
