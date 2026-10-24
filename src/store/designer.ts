import { create } from 'zustand'
import type { Design, FurnitureItem, FurnitureType, SurfaceId, SurfaceStyle, ViewMode, WallId } from './types'
import { DEFAULT_PRESET, EXISTING_WHITE, PRESETS, newId } from '../data/presets'
import { decodeDesign, encodeDesign } from '../lib/urlState'

export const FOOTPRINT: Record<Exclude<FurnitureType, 'custom'>, [number, number]> = {
  sofa: [2.1, 0.95],
  armchair: [0.95, 0.95],
  bed: [1.7, 2.1],
  table: [1.5, 1.5],
  desk: [1.4, 1.2],
  shelf: [1.0, 0.38],
  wardrobe: [1.3, 0.62],
  tv: [1.6, 0.5],
  plant: [0.55, 0.55],
  lamp: [0.45, 0.45],
  rug: [2.2, 1.5],
}

export const FURNITURE_LABEL: Record<FurnitureType, string> = {
  sofa: 'Pohovka', armchair: 'Křeslo', bed: 'Postel', table: 'Jídelní stůl', desk: 'Pracovní stůl',
  shelf: 'Knihovna', wardrobe: 'Skříň', tv: 'TV stolek', plant: 'Pokojová rostlina', lamp: 'Stojací lampa',
  rug: 'Koberec', custom: 'Vlastní model',
}

const DEFAULT_COLOR: Record<FurnitureType, string> = {
  sofa: '#3f4a5a', armchair: '#a0674a', bed: '#d8d2c6', table: '#a98862', desk: '#c8a97a', shelf: '#8d6e4b',
  wardrobe: '#cfc7b8', tv: '#2b2b2b', plant: '#4f7a4a', lamp: '#e8d3a4', rug: '#c9c1b2', custom: '#ffffff',
}

export function footprintOf(f: FurnitureItem): [number, number] {
  const [w, d] = f.size ?? (f.type === 'custom' ? [1, 1] : FOOTPRINT[f.type])
  return f.rot % 2 === 1 ? [d, w] : [w, d]
}

export function clampItem(design: Design, f: FurnitureItem, x: number, z: number) {
  const [fw, fd] = footprintOf(f)
  const mx = Math.max(0, design.room.w / 2 - fw / 2 - 0.02)
  const mz = Math.max(0, design.room.d / 2 - fd / 2 - 0.02)
  return { x: Math.min(mx, Math.max(-mx, x)), z: Math.min(mz, Math.max(-mz, z)) }
}

interface Variant { name: string; design: Design }

export interface Room { id: string; name: string; design: Design }

interface DesignerState {
  design: Design
  selected: SurfaceId[]
  selectedFurniture: string | null
  view: ViewMode
  compare: boolean
  split: number
  toast: string | null
  variants: (Variant | null)[]
  activePreset: string | null
  /** během pořizování snímku – skryje obrysy a výběr */
  capturing: boolean
  /** shrnutí barev z režimu „Vaše fotka“ pro poptávku */
  photoSummary: string | null
  /** všechny místnosti zákazníka; návrh aktivní místnosti je v `design` */
  rooms: Room[]
  activeRoom: string
  wizard: boolean

  addRoom: (name: string, design: Design) => void
  switchRoom: (id: string) => void
  deleteRoom: (id: string) => void
  openWizard: (open: boolean) => void

  select: (id: SurfaceId, additive?: boolean) => void
  selectWalls: () => void
  selectAll: () => void
  selectFurniture: (id: string | null) => void
  paint: (patch: Partial<SurfaceStyle>) => void
  paintBefore: (hex: string) => void
  applyCombo: (c: { base: SurfaceStyle; accent: SurfaceStyle; ceiling: SurfaceStyle; trim: SurfaceStyle }) => void
  setRoom: (patch: Partial<Design['room']>) => void
  setWindowWall: (w: WallId) => void
  setDoorWall: (w: WallId) => void
  setFloor: (f: Design['floor']) => void
  setTime: (t: number) => void
  setLamps: (on: boolean) => void
  setView: (v: ViewMode) => void
  setCompare: (on: boolean) => void
  setSplit: (v: number) => void
  addFurniture: (type: FurnitureType, extra?: Partial<FurnitureItem>) => void
  moveFurniture: (id: string, x: number, z: number) => void
  rotateFurniture: (id: string) => void
  recolorFurniture: (id: string, color: string) => void
  setFurnitureSize: (id: string, size: [number, number]) => void
  removeFurniture: (id: string) => void
  loadPreset: (id: string) => void
  replaceDesign: (d: Design) => void
  saveVariant: (slot: number) => void
  loadVariant: (slot: number) => void
  say: (msg: string) => void
}

const STORAGE = 'spejtek-variants-v1'
function loadVariants(): (Variant | null)[] {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length === 3) return arr
    }
  } catch { /* soukromý režim apod. */ }
  return [null, null, null]
}

const ROOMS = 'spejtek-rooms-v1'

function initialRooms(): { rooms: Room[]; activeRoom: string; fromLink: boolean } {
  const fallback = DEFAULT_PRESET.make()
  if (typeof location !== 'undefined') {
    const code = new URLSearchParams(location.search).get('n')
    if (code) {
      const d = decodeDesign(code, fallback)
      if (d) return { rooms: [{ id: 'r-link', name: 'Návrh z odkazu', design: d }], activeRoom: 'r-link', fromLink: true }
    }
    try {
      const raw = localStorage.getItem(ROOMS)
      if (raw) {
        const saved = JSON.parse(raw) as { rooms: Room[]; activeRoom: string }
        const rooms = (saved.rooms ?? []).map((r) => ({ ...r, design: decodeDesign(encodeDesign(r.design), fallback) ?? fallback }))
        if (rooms.length) return { rooms, activeRoom: rooms.some((r) => r.id === saved.activeRoom) ? saved.activeRoom : rooms[0].id, fromLink: false }
      }
    } catch { /* poškozená data se ignorují */ }
  }
  return { rooms: [{ id: 'r-default', name: DEFAULT_PRESET.label, design: fallback }], activeRoom: 'r-default', fromLink: false }
}
const boot = initialRooms()

/** Všechny místnosti včetně aktuálních úprav té právě otevřené. */
export function allRooms(s: Pick<DesignerState, 'rooms' | 'activeRoom' | 'design'>): Room[] {
  return s.rooms.map((r) => (r.id === s.activeRoom ? { ...r, design: s.design } : r))
}

/** Najde volné místo na podlaze (nejdřív u přední hrany, pak dovnitř). */
function findFreeSpot(design: Design, f: FurnitureItem): { x: number; z: number } {
  const [fw, fd] = footprintOf(f)
  const others = design.furniture.filter((o) => o.type !== 'rug').map((o) => ({ o, fp: footprintOf(o) }))
  const hw = design.room.w / 2 - fw / 2 - 0.1
  const hd = design.room.d / 2 - fd / 2 - 0.1
  const free = (x: number, z: number) =>
    others.every(({ o, fp }) => Math.abs(o.x - x) >= (fp[0] + fw) / 2 + 0.05 || Math.abs(o.z - z) >= (fp[1] + fd) / 2 + 0.05)
  if (hw <= 0 || hd <= 0) return { x: 0, z: 0 }
  const cand: { x: number; z: number; score: number }[] = []
  for (let x = -hw; x <= hw + 1e-6; x += 0.25) for (let z = -hd; z <= hd + 1e-6; z += 0.25) cand.push({ x, z, score: -z * 2 + Math.abs(x) })
  cand.sort((a, b) => a.score - b.score)
  return cand.find((c) => free(c.x, c.z)) ?? { x: 0, z: 0 }
}

const WALLS: SurfaceId[] = ['wallN', 'wallE', 'wallS', 'wallW']
let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useDesigner = create<DesignerState>((set, get) => ({
  design: boot.rooms.find((r) => r.id === boot.activeRoom)!.design,
  rooms: boot.rooms,
  activeRoom: boot.activeRoom,
  wizard: false,
  selected: [...WALLS],
  selectedFurniture: null,
  view: 'model',
  compare: false,
  split: 0.5,
  toast: null,
  variants: loadVariants(),
  capturing: false,
  photoSummary: null,
  activePreset: boot.fromLink ? null : DEFAULT_PRESET.id,

  select: (id, additive) =>
    set((s) => ({
      selectedFurniture: null,
      selected: additive ? (s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id]) : [id],
    })),
  selectWalls: () => set({ selected: [...WALLS], selectedFurniture: null }),
  selectAll: () => set({ selected: [...WALLS, 'ceiling', 'trim'], selectedFurniture: null }),
  selectFurniture: (id) => set({ selectedFurniture: id }),

  paint: (patch) =>
    set((s) => {
      const surfaces = { ...s.design.surfaces }
      for (const id of s.selected) surfaces[id] = { ...surfaces[id], ...patch }
      return { design: { ...s.design, surfaces }, activePreset: null }
    }),
  applyCombo: (c) =>
    set((s) => {
      // akcent na zadní stěnu (je vidět z výchozího pohledu i zevnitř), ne na stěnu s oknem
      const order: SurfaceId[] = ['wallN', 'wallW', 'wallE', 'wallS']
      const blocked = new Set([`wall${s.design.windowWall}`])
      const accentWall = order.find((w) => !blocked.has(w)) ?? 'wallN'
      const surfaces = { ...s.design.surfaces }
      for (const w of WALLS) surfaces[w] = { ...(w === accentWall ? c.accent : c.base) }
      surfaces.ceiling = { ...c.ceiling }
      surfaces.trim = { ...c.trim }
      return { design: { ...s.design, surfaces }, activePreset: null, selected: [accentWall] }
    }),
  paintBefore: (hex) =>
    set((s) => {
      const before = { ...s.design.before }
      for (const k of Object.keys(before) as SurfaceId[]) if (k !== 'trim') before[k] = { ...before[k], hex }
      return { design: { ...s.design, before } }
    }),

  setRoom: (patch) =>
    set((s) => {
      const room = { ...s.design.room, ...patch }
      const design = { ...s.design, room }
      design.furniture = design.furniture.map((f) => ({ ...f, ...clampItem(design, f, f.x, f.z) }))
      return { design, activePreset: null }
    }),
  setWindowWall: (w) =>
    set((s) => {
      const doorWall = s.design.doorWall === w ? s.design.windowWall : s.design.doorWall
      return { design: { ...s.design, windowWall: w, doorWall } }
    }),
  setDoorWall: (w) =>
    set((s) => {
      const windowWall = s.design.windowWall === w ? s.design.doorWall : s.design.windowWall
      return { design: { ...s.design, doorWall: w, windowWall } }
    }),
  setFloor: (floor) => set((s) => ({ design: { ...s.design, floor } })),
  setTime: (time) => set((s) => ({ design: { ...s.design, time } })),
  setLamps: (lampsOn) => set((s) => ({ design: { ...s.design, lampsOn } })),
  setView: (view) => set({ view }),
  setCompare: (compare) => set({ compare }),
  setSplit: (split) => set({ split: Math.min(0.97, Math.max(0.03, split)) }),

  addFurniture: (type, extra) =>
    set((s) => {
      const f: FurnitureItem = { id: newId(), type, x: 0, z: 0, rot: 0, color: DEFAULT_COLOR[type], ...extra }
      Object.assign(f, type === 'rug' ? { x: 0, z: 0 } : findFreeSpot(s.design, f))
      Object.assign(f, clampItem(s.design, f, f.x, f.z))
      return { design: { ...s.design, furniture: [...s.design.furniture, f] }, selectedFurniture: f.id }
    }),
  moveFurniture: (id, x, z) =>
    set((s) => ({
      design: {
        ...s.design,
        furniture: s.design.furniture.map((f) => (f.id === id ? { ...f, ...clampItem(s.design, f, x, z) } : f)),
      },
    })),
  rotateFurniture: (id) =>
    set((s) => {
      const furniture = s.design.furniture.map((f) => {
        if (f.id !== id) return f
        const r = { ...f, rot: ((f.rot + 1) % 4) as 0 | 1 | 2 | 3 }
        return { ...r, ...clampItem(s.design, r, r.x, r.z) }
      })
      return { design: { ...s.design, furniture } }
    }),
  recolorFurniture: (id, color) =>
    set((s) => ({ design: { ...s.design, furniture: s.design.furniture.map((f) => (f.id === id ? { ...f, color } : f)) } })),
  setFurnitureSize: (id, size) =>
    set((s) => ({ design: { ...s.design, furniture: s.design.furniture.map((f) => (f.id === id ? { ...f, size } : f)) } })),
  removeFurniture: (id) =>
    set((s) => {
      const gone = s.design.furniture.find((f) => f.id === id)
      if (gone?.url) URL.revokeObjectURL(gone.url)
      return { design: { ...s.design, furniture: s.design.furniture.filter((f) => f.id !== id) }, selectedFurniture: null }
    }),

  loadPreset: (id) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) return
    for (const f of get().design.furniture) if (f.url) URL.revokeObjectURL(f.url)
    set({ design: p.make(), activePreset: id, selected: [...WALLS], selectedFurniture: null, compare: false })
  },
  replaceDesign: (design) => set({ design, activePreset: null, selectedFurniture: null }),

  saveVariant: (slot) => {
    const { design, variants } = get()
    const copy: Design = JSON.parse(JSON.stringify({ ...design, furniture: design.furniture.filter((f) => f.type !== 'custom') }))
    const next = variants.slice()
    next[slot] = { name: 'Varianta ' + 'ABC'[slot], design: copy }
    try { localStorage.setItem(STORAGE, JSON.stringify(next)) } catch { /* ignorováno */ }
    set({ variants: next })
    get().say(`Uloženo jako varianta ${'ABC'[slot]}`)
  },
  loadVariant: (slot) => {
    const v = get().variants[slot]
    if (!v) return
    set({ design: JSON.parse(JSON.stringify(v.design)), activePreset: null, selectedFurniture: null })
  },

  addRoom: (name, design) =>
    set((s) => {
      const id = 'r' + newId()
      const rooms = [...allRooms(s), { id, name, design }]
      return { rooms, activeRoom: id, design, wizard: false, activePreset: null, selected: [...WALLS], selectedFurniture: null, compare: false }
    }),
  switchRoom: (id) =>
    set((s) => {
      const rooms = allRooms(s)
      const r = rooms.find((x) => x.id === id)
      if (!r) return {}
      return { rooms, activeRoom: id, design: r.design, activePreset: null, selectedFurniture: null, compare: false }
    }),
  deleteRoom: (id) =>
    set((s) => {
      const rooms = allRooms(s).filter((r) => r.id !== id)
      // poslední místnost smazaná → rovnou nabídneme založení vlastní
      if (!rooms.length) return { rooms: [], activeRoom: '', wizard: true, selectedFurniture: null }
      const active = s.activeRoom === id ? rooms[0] : rooms.find((r) => r.id === s.activeRoom)!
      return { rooms, activeRoom: active.id, design: active.design, selectedFurniture: null }
    }),
  openWizard: (wizard) =>
    set((s) => {
      // zavření průvodce bez místnosti → vrátíme výchozí, ať není scéna prázdná
      if (!wizard && !s.rooms.length) {
        const design = DEFAULT_PRESET.make()
        return { wizard, rooms: [{ id: 'r-default', name: DEFAULT_PRESET.label, design }], activeRoom: 'r-default', design }
      }
      return { wizard }
    }),

  say: (toast) => {
    set({ toast })
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: null }), 2600)
  },
}))

export { EXISTING_WHITE }

/* uložení místností v prohlížeči (bez vlastních modelů) */
let saveTimer: ReturnType<typeof setTimeout> | undefined
useDesigner.subscribe((s, prev) => {
  if (s.design === prev.design && s.rooms === prev.rooms && s.activeRoom === prev.activeRoom) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const st = useDesigner.getState()
      if (!st.rooms.length) return
      const rooms = allRooms(st).map((r) => ({ ...r, design: { ...r.design, furniture: r.design.furniture.filter((f) => f.type !== 'custom') } }))
      localStorage.setItem(ROOMS, JSON.stringify({ rooms, activeRoom: st.activeRoom }))
    } catch { /* soukromý režim apod. */ }
  }, 400)
})
