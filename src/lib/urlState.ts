import type { Design } from '../store/types'
import { FLOOR_IDS } from './textures'

type Share = Omit<Design, 'furniture'> & { furniture: Omit<Design['furniture'][number], 'url'>[] }

const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64 = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)))
}

export function encodeDesign(d: Design): string {
  const share: Share = { ...d, furniture: d.furniture.filter((f) => f.type !== 'custom').map(({ url: _u, ...f }) => f) }
  return toB64(JSON.stringify(share))
}

const HEX = /^#[0-9a-fA-F]{6}$/
const num = (v: unknown, lo: number, hi: number, fb: number) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb)

/** Bezpečné načtení návrhu z odkazu – cokoliv neplatného se zahodí. */
export function decodeDesign(code: string, fallback: Design): Design | null {
  try {
    const raw = JSON.parse(fromB64(code)) as Partial<Share>
    if (!raw || typeof raw !== 'object') return null
    const walls = ['N', 'E', 'S', 'W']
    const surfaceKeys = ['wallN', 'wallE', 'wallS', 'wallW', 'ceiling', 'trim'] as const
    const cleanStyle = (v: unknown, fb: Design['surfaces']['wallN']) => {
      const o = (v ?? {}) as Record<string, unknown>
      return {
        hex: typeof o.hex === 'string' && HEX.test(o.hex) ? o.hex : fb.hex,
        finish: o.finish === 'satin' || o.finish === 'gloss' ? o.finish : 'matte',
        texture: o.texture === 'concrete' || o.texture === 'venetian' || o.texture === 'gold' ? o.texture : 'none',
      } as Design['surfaces']['wallN']
    }
    const surfaces = {} as Design['surfaces']
    const before = {} as Design['before']
    for (const k of surfaceKeys) {
      surfaces[k] = cleanStyle(raw.surfaces?.[k], fallback.surfaces[k])
      before[k] = cleanStyle(raw.before?.[k], fallback.before[k])
    }
    const types = ['sofa', 'armchair', 'bed', 'table', 'desk', 'shelf', 'wardrobe', 'tv', 'plant', 'lamp', 'rug']
    const furniture = (Array.isArray(raw.furniture) ? raw.furniture : [])
      .filter((f) => f && types.includes(f.type))
      .slice(0, 30)
      .map((f, i) => ({
        id: `s${i}`,
        type: f.type,
        x: num(f.x, -10, 10, 0),
        z: num(f.z, -10, 10, 0),
        rot: ([0, 1, 2, 3].includes(f.rot as number) ? f.rot : 0) as 0 | 1 | 2 | 3,
        color: typeof f.color === 'string' && HEX.test(f.color) ? f.color : '#888888',
      }))
    const ww = walls.includes(raw.windowWall as string) ? raw.windowWall! : fallback.windowWall
    let dw = walls.includes(raw.doorWall as string) ? raw.doorWall! : fallback.doorWall
    if (dw === ww) dw = walls[(walls.indexOf(ww) + 1) % 4] as typeof dw
    return {
      room: { w: num(raw.room?.w, 2.5, 9, 4.5), d: num(raw.room?.d, 2.5, 9, 4), h: num(raw.room?.h, 2.2, 3.6, 2.6) },
      windowWall: ww,
      doorWall: dw,
      surfaces,
      before,
      floor: FLOOR_IDS.includes(raw.floor as Design['floor']) ? raw.floor! : 'oak',
      furniture,
      time: num(raw.time, 6, 21, 17.5),
      lampsOn: !!raw.lampsOn,
    }
  } catch {
    return null
  }
}

export function shareUrl(d: Design): string {
  return `${location.origin}/vizualizator?n=${encodeDesign(d)}`
}
