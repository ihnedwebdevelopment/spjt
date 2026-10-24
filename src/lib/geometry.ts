import { PAINT } from '../config'
import { PAINTS, FINISHES, TEXTURES } from '../data/paints'
import type { Design, SurfaceId, WallId } from '../store/types'


export const WINDOW = { w: 1.6, h: 1.3, sill: 0.9 }
export const DOOR = { w: 0.9, h: 2.05 }

export const WALL_IDS: WallId[] = ['N', 'E', 'S', 'W']
export const WALL_SURFACE: Record<WallId, SurfaceId> = { N: 'wallN', E: 'wallE', S: 'wallS', W: 'wallW' }
export const SURFACE_LABEL: Record<SurfaceId, string> = {
  wallN: 'Stěna sever (vzadu)',
  wallE: 'Stěna východ (vpravo)',
  wallS: 'Stěna jih (vpředu)',
  wallW: 'Stěna západ (vlevo)',
  ceiling: 'Strop',
  trim: 'Lišty a sokl',
}
export const WALL_LABEL: Record<WallId, string> = { N: 'Sever', E: 'Východ', S: 'Jih', W: 'Západ' }

export interface Opening {
  kind: 'window' | 'door'
  /** střed otvoru podél stěny (m, 0 = střed stěny) */
  u: number
  w: number
  v0: number
  v1: number
}

export function wallLength(d: Design, wall: WallId): number {
  return wall === 'N' || wall === 'S' ? d.room.w : d.room.d
}

export function openingsFor(d: Design, wall: WallId): Opening[] {
  const L = wallLength(d, wall)
  const out: Opening[] = []
  if (d.windowWall === wall) {
    const w = Math.min(WINDOW.w, L - 0.8)
    const v1 = Math.min(WINDOW.sill + WINDOW.h, d.room.h - 0.3)
    out.push({ kind: 'window', u: 0, w, v0: WINDOW.sill, v1 })
  }
  if (d.doorWall === wall) {
    const w = DOOR.w
    const u = Math.max(-(L / 2 - w / 2 - 0.35), Math.min(L / 2 - w / 2 - 0.35, L / 2 - w / 2 - 0.55))
    out.push({ kind: 'door', u, w, v0: 0, v1: Math.min(DOOR.h, d.room.h - 0.2) })
  }
  return out
}

export function surfaceArea(d: Design, id: SurfaceId): number {
  if (id === 'ceiling') return d.room.w * d.room.d
  if (id === 'trim') return 0
  const wall = (Object.keys(WALL_SURFACE) as WallId[]).find((k) => WALL_SURFACE[k] === id)!
  const gross = wallLength(d, wall) * d.room.h
  const holes = openingsFor(d, wall).reduce((s, o) => s + o.w * (o.v1 - o.v0), 0)
  return Math.max(0, gross - holes)
}

export interface EstimateLine {
  key: string
  label: string
  hex: string
  finish: string
  texture: string
  area: number
  litres: number
  surfaces: SurfaceId[]
}

export function estimate(d: Design): { lines: EstimateLine[]; totalArea: number } {
  const map = new Map<string, EstimateLine>()
  for (const id of ['wallN', 'wallE', 'wallS', 'wallW', 'ceiling'] as SurfaceId[]) {
    const s = d.surfaces[id]
    const key = `${s.hex}|${s.finish}|${s.texture}`
    const area = surfaceArea(d, id)
    const line = map.get(key)
    if (line) {
      line.area += area
      line.surfaces.push(id)
    } else {
      const paint = PAINTS.find((p) => p.hex.toLowerCase() === s.hex.toLowerCase())
      map.set(key, {
        key,
        label: paint?.name ?? 'Vlastní odstín ' + s.hex.toUpperCase(),
        hex: s.hex,
        finish: FINISHES.find((f) => f.id === s.finish)!.label,
        texture: TEXTURES.find((t) => t.id === s.texture)!.label,
        area,
        litres: 0,
        surfaces: [id],
      })
    }
  }
  const lines = [...map.values()].map((l) => ({
    ...l,
    litres: Math.max(0.5, Math.ceil(((l.area * PAINT.coats) / PAINT.coverageM2PerLitre) * 2) / 2),
  }))
  return { lines, totalArea: lines.reduce((s, l) => s + l.area, 0) }
}

export const fmt = (n: number, digits = 1) => n.toLocaleString('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Poloha slunce: čas 6–21 h, azimut východ → jih → západ. Vrací jednotkový vektor ke slunci a elevaci ve stupních. */
export function sunVector(time: number): { dir: [number, number, number]; elevation: number } {
  const t = Math.min(21, Math.max(6, time))
  const az = ((90 + ((t - 6) / 15) * 180) * Math.PI) / 180
  const elev = 6 + Math.sin((Math.PI * (t - 6)) / 15) * 52
  const e = (elev * Math.PI) / 180
  return { dir: [Math.sin(az) * Math.cos(e), Math.sin(e), -Math.cos(az) * Math.cos(e)], elevation: elev }
}

const SKY: [number, string, string][] = [
  [5, '#27304f', '#e9a27a'],
  [7, '#9fc2e6', '#f5d9b8'],
  [12, '#7fb2e8', '#dcecf8'],
  [17, '#8fb4e0', '#f7dcb4'],
  [19.5, '#5c6fa8', '#f0a47a'],
  [22, '#1a2038', '#3a3f68'],
]

/** Barva oblohy nahoře a u obzoru pro daný čas. */
export function skyStops(time: number): [string, string] {
  let a = SKY[0], b = SKY[SKY.length - 1]
  for (let i = 0; i < SKY.length - 1; i++) {
    if (time >= SKY[i][0] && time <= SKY[i + 1][0]) {
      a = SKY[i]
      b = SKY[i + 1]
      break
    }
  }
  const k = b[0] === a[0] ? 0 : (time - a[0]) / (b[0] - a[0])
  const mix = (x: string, y: string) => {
    const px = parseInt(x.slice(1), 16), py = parseInt(y.slice(1), 16)
    const ch = (s: number) => Math.round(((px >> s) & 255) * (1 - k) + ((py >> s) & 255) * k)
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`
  }
  return [mix(a[1], b[1]), mix(a[2], b[2])]
}

export function skyGradient(time: number): string {
  const [top, bottom] = skyStops(time)
  return `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`
}
