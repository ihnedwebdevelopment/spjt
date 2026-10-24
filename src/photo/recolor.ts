/**
 * Přebarvení stěn na fotografii – vše běží v prohlížeči, nic se neodesílá.
 *
 * 1. Fotka se převede do barevného prostoru CIELAB (L = jas, a/b = barva).
 * 2. Klepnutí na stěnu spustí „chytré vyplnění“: oblast roste, dokud se barva
 *    plynule mění (stín, světlo) a nenarazí na hranu (rám, nábytek, roh).
 * 3. Přebarvení zachová poměr jasu každého pixelu k průměru stěny – stíny,
 *    světlo z okna i struktura omítky zůstanou, jen barva je nová.
 */

export interface Photo {
  w: number
  h: number
  /** původní pixely RGBA */
  src: Uint8ClampedArray
  /** L, a, b pro každý pixel */
  lab: Float32Array
  /** síla hrany 0..1 (Sobel na jasu) */
  edge: Float32Array
}

/* ───────── barevné převody ───────── */

const LIN = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
const toSrgb = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(c * 255)))
}
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
const fi = (t: number) => (t * t * t > 216 / 24389 ? t * t * t : (116 * t - 16) / (24389 / 27))
const XN = 0.95047, ZN = 1.08883

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = LIN[r], G = LIN[g], B = LIN[b]
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / XN
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / ZN
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function labToRgb(L: number, A: number, Bv: number): [number, number, number] {
  const fy = (L + 16) / 116
  const fx = fy + A / 500
  const fz = fy - Bv / 200
  const x = fi(fx) * XN, y = fi(fy), z = fi(fz) * ZN
  const r = x * 3.2406 - y * 1.5372 - z * 0.4986
  const g = -x * 0.9689 + y * 1.8758 + z * 0.0415
  const b = x * 0.0557 - y * 0.204 + z * 1.057
  return [toSrgb(r), toSrgb(g), toSrgb(b)]
}

export function hexToLab(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return rgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

/* ───────── načtení fotky ───────── */

export async function loadPhoto(file: Blob | string, maxSide = 1600): Promise<{ photo: Photo; canvas: HTMLCanvasElement }> {
  const url = typeof file === 'string' ? file : URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * k))
    const h = Math.max(1, Math.round(img.naturalHeight * k))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w, h)
    const src = ctx.getImageData(0, 0, w, h).data
    return { photo: analyse(src, w, h), canvas }
  } finally {
    if (typeof file !== 'string') URL.revokeObjectURL(url)
  }
}

export function analyse(src: Uint8ClampedArray, w: number, h: number): Photo {
  const n = w * h
  const lab = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const [L, A, B] = rgbToLab(src[i * 4], src[i * 4 + 1], src[i * 4 + 2])
    lab[i * 3] = L
    lab[i * 3 + 1] = A
    lab[i * 3 + 2] = B
  }
  // jemně rozmazaný jas → Sobel (odfiltruje šum fotky, nechá skutečné hrany)
  const Ls = new Float32Array(n)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, c = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          s += lab[(yy * w + xx) * 3]
          c++
        }
      }
      Ls[y * w + x] = s / c
    }
  }
  const edge = new Float32Array(n)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const gx = -Ls[i - w - 1] - 2 * Ls[i - 1] - Ls[i + w - 1] + Ls[i - w + 1] + 2 * Ls[i + 1] + Ls[i + w + 1]
      const gy = -Ls[i - w - 1] - 2 * Ls[i - w] - Ls[i - w + 1] + Ls[i + w - 1] + 2 * Ls[i + w] + Ls[i + w + 1]
      edge[i] = Math.min(1, Math.hypot(gx, gy) / 60)
    }
  }
  return { w, h, src, lab, edge }
}

/* ───────── chytré vyplnění plochy ───────── */

/**
 * Najde souvislou plochu stěny od bodu (sx, sy).
 * @param tolerance 0..100 – jak moc se smí barva lišit (vyšší = větší plocha)
 */
export function magicSelect(p: Photo, sx: number, sy: number, tolerance: number): Uint8Array {
  // pojistka: když výběr „přeteče“ přes většinu fotky, automaticky se zpřísní
  let t = tolerance
  for (let k = 0; k < 4; k++) {
    const m = selectOnce(p, sx, sy, t)
    let n = 0
    for (let i = 0; i < m.length; i += 3) if (m[i] === 255) n++
    if ((n * 3) / m.length < 0.55 || t <= 6) return m
    t *= 0.6
  }
  return selectOnce(p, sx, sy, t)
}

function selectOnce(p: Photo, sx: number, sy: number, tolerance: number): Uint8Array {
  const { w, h, lab, edge } = p
  const out = new Uint8Array(w * h)
  sx = Math.max(0, Math.min(w - 1, Math.round(sx)))
  sy = Math.max(0, Math.min(h - 1, Math.round(sy)))

  // průměr kolem bodu kliknutí
  let sL = 0, sA = 0, sB = 0, c = 0
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const x = sx + dx, y = sy + dy
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      const i = (y * w + x) * 3
      sL += lab[i]; sA += lab[i + 1]; sB += lab[i + 2]; c++
    }
  }
  sL /= c; sA /= c; sB /= c

  const t = tolerance / 100
  const tGlobal = 8 + t * 34 // vůči kliknuté barvě (jas se váží méně – stěny bývají nasvícené nerovnoměrně)
  const tLocal = 1.6 + t * 4.5 // mezi sousedními pixely
  const tEdge = 0.18 + t * 0.32
  const g2 = tGlobal * tGlobal, l2 = tLocal * tLocal

  const queue = new Int32Array(w * h)
  let head = 0, tail = 0
  const seed = sy * w + sx
  queue[tail++] = seed
  out[seed] = 255
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    const L = lab[i * 3], A = lab[i * 3 + 1], B = lab[i * 3 + 2]
    for (let k = 0; k < 4; k++) {
      let j: number
      if (k === 0) { if (x === 0) continue; j = i - 1 }
      else if (k === 1) { if (x === w - 1) continue; j = i + 1 }
      else if (k === 2) { if (i < w) continue; j = i - w }
      else { if (i >= w * (h - 1)) continue; j = i + w }
      if (out[j]) continue
      if (edge[j] > tEdge) continue
      const jL = lab[j * 3], jA = lab[j * 3 + 1], jB = lab[j * 3 + 2]
      const dl = jL - L, da = jA - A, db = jB - B
      if (dl * dl + da * da + db * db > l2) continue
      const gl = (jL - sL) * 0.35, ga = jA - sA, gb = jB - sB
      if (gl * gl + ga * ga + gb * gb > g2) continue
      out[j] = 255
      queue[tail++] = j
    }
  }
  const closed = closeHoles(out, w, h)
  return refineEdges(p, closed, tGlobal)
}

/**
 * Zpřesnění okrajů: pixely těsně za hranou výběru, které barvou stěně odpovídají
 * aspoň zčásti (světlý lem kolem listů, rozmazaný přechod u rámu), dostanou
 * částečnou průhlednost. Díky tomu nevzniká bílá „svatozář“ kolem předmětů.
 */
function refineEdges(p: Photo, m: Uint8Array, tGlobal: number): Uint8Array {
  const { w, h, lab } = p
  let sL = 0, sA = 0, sB = 0, n = 0
  for (let i = 0; i < m.length; i += 7) {
    if (m[i] !== 255) continue
    sL += lab[i * 3]; sA += lab[i * 3 + 1]; sB += lab[i * 3 + 2]; n++
  }
  if (!n) return m
  sL /= n; sA /= n; sB /= n
  const band = morph(m, w, h, 4, true)
  const out = m.slice()
  const full = tGlobal * 0.55, zero = tGlobal * 1.25
  for (let i = 0; i < m.length; i++) {
    if (m[i] === 255 || !band[i]) continue
    const dl = (lab[i * 3] - sL) * 0.45, da = lab[i * 3 + 1] - sA, db = lab[i * 3 + 2] - sB
    const d = Math.sqrt(dl * dl + da * da + db * db)
    const a = Math.max(0, Math.min(1, (zero - d) / (zero - full)))
    if (a > 0) out[i] = Math.max(out[i], Math.round(a * 255))
  }
  return out
}

/** Zacelí drobné díry a zubaté okraje výběru (morfologické uzavření 2 px). */
function closeHoles(m: Uint8Array, w: number, h: number): Uint8Array {
  const dil = morph(m, w, h, 2, true)
  return morph(dil, w, h, 2, false)
}

function morph(m: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  // oddělitelné: řádky, pak sloupce
  const tmp = new Uint8Array(w * h)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 255
      for (let d = -r; d <= r; d++) {
        const xx = Math.min(w - 1, Math.max(0, x + d))
        const s = m[y * w + xx]
        v = dilate ? Math.max(v, s) : Math.min(v, s)
      }
      tmp[y * w + x] = v
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 255
      for (let d = -r; d <= r; d++) {
        const yy = Math.min(h - 1, Math.max(0, y + d))
        const s = tmp[yy * w + x]
        v = dilate ? Math.max(v, s) : Math.min(v, s)
      }
      out[y * w + x] = v
    }
  }
  return out
}

/** Štětec / guma: kruh o poloměru r do masky. */
export function paintDisc(m: Uint8Array, w: number, h: number, cx: number, cy: number, r: number, value: 0 | 255) {
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r))
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r))
  const r2 = r * r
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy
      if (dx * dx + dy * dy <= r2) m[y * w + x] = value
    }
  }
}

/** Měkký okraj masky (rozmazání 1,5 px) → přirozený přechod u hran. */
export function feather(m: Uint8Array, w: number, h: number): Float32Array {
  const a = new Float32Array(w * h)
  const tmp = new Float32Array(w * h)
  const k = [0.06, 0.24, 0.4, 0.24, 0.06]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let d = -2; d <= 2; d++) s += m[y * w + Math.min(w - 1, Math.max(0, x + d))] * k[d + 2]
      tmp[y * w + x] = s / 255
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let d = -2; d <= 2; d++) s += tmp[Math.min(h - 1, Math.max(0, y + d)) * w + x] * k[d + 2]
      a[y * w + x] = s
    }
  }
  return a
}

/** Medián jasu pod maskou – referenční „průměrný jas“ stěny. */
export function medianL(p: Photo, m: Uint8Array): number {
  const hist = new Uint32Array(101)
  let n = 0
  for (let i = 0; i < m.length; i++) {
    if (m[i] < 200) continue
    hist[Math.max(0, Math.min(100, Math.round(p.lab[i * 3])))]++
    n++
  }
  if (!n) return 70
  let acc = 0
  for (let L = 0; L <= 100; L++) {
    acc += hist[L]
    if (acc >= n / 2) return Math.max(5, L)
  }
  return 70
}

export interface Layer {
  id: string
  hex: string
  mask: Uint8Array
  alpha: Float32Array | null
  refL: number
}

/** Složí výsledný obrázek: původní fotka + přebarvené plochy. */
export function composite(p: Photo, layers: Layer[], out: ImageData) {
  const d = out.data
  d.set(p.src)
  for (const layer of layers) {
    const a = layer.alpha
    if (!a) continue
    const [tL, tA, tB] = hexToLab(layer.hex)
    const ref = layer.refL
    for (let i = 0; i < a.length; i++) {
      const al = a[i]
      if (al < 0.004) continue
      const ratio = p.lab[i * 3] / ref
      // jas: poměr k průměru stěny zachová stíny i strukturu; u tmavých odstínů trochu změkčí kontrast
      const soft = tL < 35 ? 0.75 : 1
      const L = Math.min(100, tL * (1 + (ratio - 1) * soft))
      const k = Math.min(1, Math.sqrt(Math.max(0, ratio))) // ve stínu méně sytosti, jako u skutečné barvy
      const [r, g, b] = labToRgb(L, tA * k, tB * k)
      const j = i * 4
      d[j] = d[j] + (r - d[j]) * al
      d[j + 1] = d[j + 1] + (g - d[j + 1]) * al
      d[j + 2] = d[j + 2] + (b - d[j + 2]) * al
    }
  }
}

/** Obrys masky pro zvýraznění vybrané plochy. */
export function outline(m: Uint8Array, w: number, h: number, out: ImageData, rgba: [number, number, number, number]) {
  const d = out.data
  d.fill(0)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (m[i] < 128) continue
      if (m[i - 1] >= 128 && m[i + 1] >= 128 && m[i - w] >= 128 && m[i + w] >= 128) {
        // vnitřek – jemný závoj
        if ((x + y) % 6 === 0) {
          const j = i * 4
          d[j] = rgba[0]; d[j + 1] = rgba[1]; d[j + 2] = rgba[2]; d[j + 3] = 70
        }
        continue
      }
      const j = i * 4
      d[j] = rgba[0]; d[j + 1] = rgba[1]; d[j + 2] = rgba[2]; d[j + 3] = rgba[3]
    }
  }
}

export function unionInto(target: Uint8Array, add: Uint8Array) {
  for (let i = 0; i < target.length; i++) if (add[i] > target[i]) target[i] = add[i]
}
