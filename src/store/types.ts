import type { Finish, Texture } from '../data/paints'
import type { FloorId } from '../lib/textures'

export type WallId = 'N' | 'E' | 'S' | 'W'
export type SurfaceId = 'wallN' | 'wallE' | 'wallS' | 'wallW' | 'ceiling' | 'trim'

export interface SurfaceStyle {
  hex: string
  finish: Finish
  texture: Texture
}

export type FurnitureType =
  | 'sofa' | 'armchair' | 'bed' | 'table' | 'desk' | 'shelf'
  | 'wardrobe' | 'tv' | 'plant' | 'lamp' | 'rug' | 'custom'

export interface FurnitureItem {
  id: string
  type: FurnitureType
  x: number
  z: number
  /** otočení v násobcích 90° */
  rot: 0 | 1 | 2 | 3
  color: string
  name?: string
  /** objectURL nahraného .glb (jen pro type = 'custom') */
  url?: string
  /** půdorys [šířka, hloubka] – u vlastního modelu se změří po načtení */
  size?: [number, number]
}

export interface Design {
  room: { w: number; d: number; h: number }
  windowWall: WallId
  doorWall: WallId
  surfaces: Record<SurfaceId, SurfaceStyle>
  before: Record<SurfaceId, SurfaceStyle>
  floor: FloorId
  furniture: FurnitureItem[]
  time: number
  lampsOn: boolean
}

export type ViewMode = 'model' | 'inside' | 'top'
