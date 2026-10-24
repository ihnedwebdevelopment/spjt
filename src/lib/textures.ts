import * as THREE from 'three'
import type { Texture } from '../data/paints'

/* ───────── deterministický RNG + dlaždicovatelný šum ───────── */
function rng(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lattice(cells: number, rnd: () => number) {
  const g = new Float32Array(cells * cells)
  for (let i = 0; i < g.length; i++) g[i] = rnd()
  const m = (n: number) => ((n % cells) + cells) % cells
  return (x: number, y: number) => {
    const fx = x * cells, fy = y * cells
    const x0 = Math.floor(fx), y0 = Math.floor(fy)
    let tx = fx - x0, ty = fy - y0
    tx = tx * tx * (3 - 2 * tx)
    ty = ty * ty * (3 - 2 * ty)
    const a = g[m(y0) * cells + m(x0)], b = g[m(y0) * cells + m(x0 + 1)]
    const c = g[m(y0 + 1) * cells + m(x0)], d = g[m(y0 + 1) * cells + m(x0 + 1)]
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
  }
}

/** Fraktální šum 0..1, vždy dlaždicovatelný. sx/sy natahují šum (pro tahy špachtle). */
function fbm(size: number, seed: number, octaves: number[], sx = 1, sy = 1): Float32Array {
  const r = rng(seed)
  const layers = octaves.map((c) => lattice(c, r))
  const out = new Float32Array(size * size)
  const wsum = octaves.reduce((s, _, i) => s + 1 / (i + 1), 0)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0
      for (let i = 0; i < layers.length; i++) v += layers[i](((x / size) * sx) % 1, ((y / size) * sy) % 1) / (i + 1)
      out[y * size + x] = v / wsum
    }
  }
  return out
}

function toCanvas(size: number, fn: (x: number, y: number, i: number) => [number, number, number]) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const [r, g, b] = fn(x, y, i)
      img.data[i * 4] = r
      img.data[i * 4 + 1] = g
      img.data[i * 4 + 2] = b
      img.data[i * 4 + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

const grey = (v: number): [number, number, number] => {
  const k = Math.max(0, Math.min(255, Math.round(v * 255)))
  return [k, k, k]
}

/* ───────── povrchy stěn ───────── */
export interface SurfaceMaps {
  albedo: HTMLCanvasElement
  bump: HTMLCanvasElement
  bumpScale: number
}

const mapCache = new Map<string, SurfaceMaps>()

export function surfaceMapsCanvas(kind: Exclude<Texture, 'none'>): SurfaceMaps {
  const hit = mapCache.get(kind)
  if (hit) return hit
  const size = 512
  let result: SurfaceMaps

  if (kind === 'concrete') {
    const big = fbm(size, 11, [3, 6, 12])
    const mid = fbm(size, 12, [24, 48, 96])
    const pores = rng(13)
    const poreMap = new Float32Array(size * size)
    for (let i = 0; i < 1400; i++) poreMap[Math.floor(pores() * size * size)] = 1
    result = {
      albedo: toCanvas(size, (_x, _y, i) => grey(0.74 + 0.26 * big[i] - 0.06 * poreMap[i])),
      bump: toCanvas(size, (_x, _y, i) => grey(0.45 * mid[i] + 0.4 * big[i] - 0.25 * poreMap[i] + 0.2)),
      bumpScale: 2.2,
    }
  } else {
    // benátský štuk + zlatá stěrka: dlouhé křížové tahy špachtle
    const a = fbm(size, 21, [2, 4, 8], 1, 6)
    const b = fbm(size, 22, [2, 4, 8], 6, 1)
    const soft = fbm(size, 23, [3, 6])
    const gold = kind === 'gold'
    result = {
      albedo: toCanvas(size, (_x, _y, i) => {
        const v = (a[i] * 0.5 + b[i] * 0.5 - 0.5) * (gold ? 1.5 : 0.9) + soft[i] * 0.25
        return grey((gold ? 0.72 : 0.88) + v * (gold ? 0.55 : 0.3))
      }),
      bump: toCanvas(size, (_x, _y, i) => grey(0.5 + (a[i] - b[i]) * 0.5)),
      bumpScale: gold ? 0.9 : 0.5,
    }
  }
  mapCache.set(kind, result)
  return result
}

const threeCache = new Map<string, { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; bumpScale: number }>()

export function surfaceTextures(kind: Texture) {
  if (kind === 'none') return null
  const hit = threeCache.get(kind)
  if (hit) return hit
  const maps = surfaceMapsCanvas(kind)
  const map = new THREE.CanvasTexture(maps.albedo)
  const bump = new THREE.CanvasTexture(maps.bump)
  for (const t of [map, bump]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(0.5, 0.5) // UV jsou v metrech → dlaždice 2 × 2 m
    t.anisotropy = 8
  }
  map.colorSpace = THREE.SRGBColorSpace
  const out = { map, bump, bumpScale: maps.bumpScale }
  threeCache.set(kind, out)
  return out
}

/** Náhled povrchu jako data URL – pro karty realizací bez WebGL. */
export function swatchDataURL(kind: Texture, hex: string, w = 480, h = 360): string {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, w, h)
  if (kind !== 'none') {
    const m = surfaceMapsCanvas(kind)
    ctx.globalCompositeOperation = 'multiply'
    const pat = ctx.createPattern(m.albedo, 'repeat')
    if (pat) {
      ctx.fillStyle = pat
      ctx.fillRect(0, 0, w, h)
    }
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = 0.35
    const bp = ctx.createPattern(m.bump, 'repeat')
    if (bp) {
      ctx.fillStyle = bp
      ctx.fillRect(0, 0, w, h)
    }
  }
  return c.toDataURL('image/jpeg', 0.85)
}

/* ───────── podlahy ───────── */
export type FloorId = 'oak' | 'herringbone' | 'walnut' | 'tile' | 'concrete'

export const FLOORS: { id: FloorId; label: string; swatch: string }[] = [
  { id: 'oak', label: 'Dub', swatch: '#c79a62' },
  { id: 'herringbone', label: 'Rybí kost', swatch: '#b88a57' },
  { id: 'walnut', label: 'Ořech', swatch: '#6b4a34' },
  { id: 'tile', label: 'Dlažba', swatch: '#b9b8b2' },
  { id: 'concrete', label: 'Beton', swatch: '#8f8e89' },
]
export const FLOOR_IDS = FLOORS.map((f) => f.id)

export interface FloorMaps { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; rough: THREE.CanvasTexture; bumpScale: number }
const floorCache = new Map<FloorId, FloorMaps>()

/** Jedno prkno se žilkováním dřeva – kreslí do barvy, výšky i drsnosti zároveň. */
function plank(
  c: CanvasRenderingContext2D, b: CanvasRenderingContext2D, ro: CanvasRenderingContext2D,
  r: () => number, base: number[], x: number, y: number, w: number, h: number, vertical = false,
) {
  const t = 0.9 + r() * 0.16
  c.fillStyle = `rgb(${base[0] * t | 0},${base[1] * t | 0},${base[2] * t | 0})`
  c.fillRect(x, y, w, h)
  ro.fillStyle = `rgb(${150 + r() * 40 | 0},0,0)`
  ro.fillRect(x, y, w, h)
  b.fillStyle = '#9a9a9a'
  b.fillRect(x, y, w, h)
  const len = vertical ? h : w, th = vertical ? w : h
  const lines = Math.round(th / 3)
  for (let g = 0; g < lines; g++) {
    const o = r() * th
    const dark = r() < 0.25
    c.strokeStyle = dark ? `rgba(60,30,10,${0.08 + r() * 0.1})` : `rgba(0,0,0,${0.025 + r() * 0.05})`
    c.lineWidth = 0.6 + r() * (dark ? 1.6 : 1.1)
    c.beginPath()
    const wob = (k: number) => (r() - 0.5) * th * 0.12 * k
    if (vertical) {
      c.moveTo(x + o, y)
      c.bezierCurveTo(x + o + wob(1), y + len * 0.33, x + o + wob(1), y + len * 0.66, x + o + wob(0.5), y + len)
    } else {
      c.moveTo(x, y + o)
      c.bezierCurveTo(x + len * 0.33, y + o + wob(1), x + len * 0.66, y + o + wob(1), x + len, y + o + wob(0.5))
    }
    c.stroke()
  }
  // suky
  if (r() < 0.35) {
    const kx = x + (vertical ? r() * w : r() * w), ky = y + (vertical ? r() * h : r() * h)
    const g = c.createRadialGradient(kx, ky, 0, kx, ky, th * 0.22)
    g.addColorStop(0, 'rgba(50,25,8,0.45)')
    g.addColorStop(1, 'rgba(50,25,8,0)')
    c.fillStyle = g
    c.fillRect(kx - th, ky - th, th * 2, th * 2)
  }
  // spáry
  for (const ctx of [c, b]) {
    ctx.fillStyle = ctx === b ? '#000' : 'rgba(30,18,8,0.55)'
    ctx.fillRect(x, y, vertical ? 1.5 : w, vertical ? h : 1.5)
    ctx.fillRect(x, y, vertical ? w : 1.5, vertical ? 1.5 : h)
  }
}

export function floorTexture(id: FloorId): FloorMaps {
  const hit = floorCache.get(id)
  if (hit) return hit
  const size = 2048
  const mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = size; return cv }
  const cc = mk(), bc = mk(), rc = mk()
  const ctx = cc.getContext('2d')!, bctx = bc.getContext('2d')!, rctx = rc.getContext('2d')!
  const r = rng(id.length * 97 + id.charCodeAt(0))
  let repeat = 0.5 // 1 dlaždice textury = 2 × 2 m
  let bumpScale = 1.2

  if (id === 'oak' || id === 'walnut') {
    const base = id === 'oak' ? [201, 158, 104] : [104, 72, 50]
    const rows = 11 // 11 prken na 2 m ≈ 18 cm, beze švu
    const ph = size / rows
    for (let row = 0; row < rows; row++) {
      const rr = rng(1000 + row)
      let x = -rr() * 900
      let k = 0
      while (x < size) {
        const len = 900 + rr() * 700
        // každé prkno kreslíme i posunuté o šířku textury → bezešvé opakování
        for (const dx of [-size, 0, size]) plank(ctx, bctx, rctx, rng(row * 977 + k), base, x + dx, row * ph, len, ph)
        x += len
        k++
      }
    }
  } else if (id === 'herringbone') {
    // Rybí kost: prkénka L × W (50 × 12,5 cm), mřížka je periodická s texturou 2048 px.
    const base = [190, 142, 90]
    const W = 128, L = 512
    for (let m = -12; m <= 12; m++) {
      for (let n = -40; n <= 40; n++) {
        const n0 = ((n % 8) + 8) % 8
        const kk = (n - n0) / 8
        const m0 = (((m - 2 * kk) % 4) + 4) % 4
        const key = n0 * 4 + m0
        const ox = (n - 4 * m) * W, oy = (n + 4 * m) * W
        if (ox > size + L || ox < -L * 2 || oy > size + L || oy < -L * 2) continue
        plank(ctx, bctx, rctx, rng(5000 + key * 2), base, ox, oy, L, W)
        plank(ctx, bctx, rctx, rng(5001 + key * 2), base, ox + L, oy - 3 * W, W, L, true)
      }
    }
  } else if (id === 'tile') {
    const n = 4
    const t = size / n
    const nz = fbm(256, 71, [4, 8, 16])
    const noise = toCanvas(256, (_x, _y, i) => grey(0.85 + nz[i] * 0.2))
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const k = 0.92 + r() * 0.1
        ctx.fillStyle = `rgb(${190 * k | 0},${188 * k | 0},${181 * k | 0})`
        ctx.fillRect(x * t, y * t, t, t)
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(noise, x * t, y * t, t, t)
        ctx.globalCompositeOperation = 'source-over'
      }
    }
    rctx.fillStyle = 'rgb(90,0,0)'
    rctx.fillRect(0, 0, size, size)
    bctx.fillStyle = '#a0a0a0'
    bctx.fillRect(0, 0, size, size)
    for (let i = 0; i <= n; i++) {
      for (const [c2, col] of [[ctx, '#77756f'], [bctx, '#000'], [rctx, 'rgb(240,0,0)']] as const) {
        c2.fillStyle = col
        c2.fillRect(i * t - 5, 0, 10, size)
        c2.fillRect(0, i * t - 5, size, 10)
      }
    }
    bumpScale = 2
  } else {
    const nz = fbm(512, 51, [3, 6, 12, 24, 48])
    const fine = fbm(512, 52, [64, 128])
    const col = toCanvas(512, (_x, _y, i) => {
      const v = 0.7 + nz[i] * 0.3 - fine[i] * 0.04
      return [146 * v | 0, 145 * v | 0, 140 * v | 0]
    })
    ctx.drawImage(col, 0, 0, size, size)
    bctx.drawImage(toCanvas(512, (_x, _y, i) => grey(0.4 + fine[i] * 0.4 + nz[i] * 0.2)), 0, 0, size, size)
    rctx.drawImage(toCanvas(512, (_x, _y, i) => [110 + nz[i] * 90 | 0, 0, 0]), 0, 0, size, size)
    bumpScale = 0.6
  }

  const out: FloorMaps = {
    map: new THREE.CanvasTexture(cc),
    bump: new THREE.CanvasTexture(bc),
    rough: new THREE.CanvasTexture(rc),
    bumpScale,
  }
  for (const t of [out.map, out.bump, out.rough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat, repeat)
    t.anisotropy = 16
  }
  out.map.colorSpace = THREE.SRGBColorSpace
  floorCache.set(id, out)
  return out
}

/* ───────── výhled z okna ───────── */
let landCache: THREE.CanvasTexture | null = null

/** Jednoduchá krajina Vysočiny: obloha, kopce, les a zahrada. */
export function landscapeTexture(): THREE.CanvasTexture {
  if (landCache) return landCache
  const W = 1024, H = 640
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const r = rng(404)
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62)
  sky.addColorStop(0, '#8fb9e6')
  sky.addColorStop(1, '#eaf2f8')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  // mraky
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y = 40 + r() * H * 0.28, s = 40 + r() * 90
    const g = ctx.createRadialGradient(x, y, 0, x, y, s)
    g.addColorStop(0, 'rgba(255,255,255,0.75)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, s * 1.8, s * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const ridge = (y0: number, amp: number, col: string, freq: number) => {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y0 + Math.sin(x * freq + y0) * amp + Math.sin(x * freq * 2.7) * amp * 0.4)
    ctx.lineTo(W, H)
    ctx.fill()
  }
  ridge(H * 0.47, 12, '#b7c6d2', 0.005)
  ridge(H * 0.52, 16, '#9db1b8', 0.008)
  // vzdálený les – měkké koruny, s oparem (kreslí se do vrstvy, ta se rozmaže jednou)
  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = H
  const lctx = layer.getContext('2d')!
  const paintTrees = (into: CanvasRenderingContext2D) => {
  for (let i = 0; i < 900; i++) {
    const x = r() * W, y = H * 0.56 + r() * H * 0.07, s = 8 + r() * 16
    const g = 70 + r() * 30
    into.fillStyle = `rgba(${g * 0.62 | 0},${g | 0},${g * 0.66 | 0},0.9)`
    into.beginPath()
    if (r() < 0.55) {
      into.moveTo(x, y - s * 2.4)
      into.quadraticCurveTo(x + s * 0.9, y - s * 0.4, x + s * 0.75, y)
      into.lineTo(x - s * 0.75, y)
      into.quadraticCurveTo(x - s * 0.9, y - s * 0.4, x, y - s * 2.4)
    } else {
      into.ellipse(x, y - s * 0.9, s * 1.1, s * 1.0, 0, 0, Math.PI * 2)
    }
    into.fill()
  }
  }
  paintTrees(lctx)
  ctx.filter = 'blur(1.2px)'
  ctx.drawImage(layer, 0, 0)
  ctx.filter = 'none'
  const haze = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.66)
  haze.addColorStop(0, 'rgba(234,242,248,0.35)')
  haze.addColorStop(1, 'rgba(234,242,248,0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, H * 0.45, W, H * 0.21)
  // louka
  const lawn = ctx.createLinearGradient(0, H * 0.63, 0, H)
  lawn.addColorStop(0, '#9ab070')
  lawn.addColorStop(1, '#5f7f40')
  ctx.fillStyle = lawn
  ctx.fillRect(0, H * 0.63, W, H * 0.37)
  for (let i = 0; i < 4000; i++) {
    const x = r() * W, y = H * 0.63 + Math.pow(r(), 0.7) * H * 0.37
    ctx.fillStyle = `rgba(${40 + r() * 40 | 0},${70 + r() * 50 | 0},${30 + r() * 20 | 0},0.18)`
    ctx.fillRect(x, y, 1 + r() * 2, 2 + r() * 4 * (y / H))
  }
  // živý plot v popředí
  lctx.clearRect(0, 0, W, H)
  for (let i = 0; i < 220; i++) {
    const x = r() * W, y = H * 0.9 + r() * H * 0.06, s = 14 + r() * 22
    lctx.fillStyle = `rgb(${46 + r() * 20 | 0},${78 + r() * 25 | 0},${40 + r() * 14 | 0})`
    lctx.beginPath()
    lctx.ellipse(x, y, s * 1.2, s, 0, 0, Math.PI * 2)
    lctx.fill()
  }
  ctx.filter = 'blur(0.8px)'
  ctx.drawImage(layer, 0, 0)
  ctx.filter = 'none'
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  landCache = t
  return t
}
