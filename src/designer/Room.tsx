import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { FINISHES } from '../data/paints'
import { floorTexture, landscapeTexture, surfaceTextures } from '../lib/textures'
import { sunFactor } from './Lighting'
import { openingsFor, wallLength, WALL_SURFACE, type Opening } from '../lib/geometry'
import type { Design, SurfaceId, SurfaceStyle, WallId } from '../store/types'

/* ───────── geometrie ───────── */

function wallShape(L: number, h: number, openings: Opening[]) {
  const s = new THREE.Shape()
  const door = openings.find((o) => o.kind === 'door')
  s.moveTo(-L / 2, 0)
  if (door) {
    s.lineTo(door.u - door.w / 2, 0)
    s.lineTo(door.u - door.w / 2, door.v1)
    s.lineTo(door.u + door.w / 2, door.v1)
    s.lineTo(door.u + door.w / 2, 0)
  }
  s.lineTo(L / 2, 0)
  s.lineTo(L / 2, h)
  s.lineTo(-L / 2, h)
  s.closePath()
  for (const o of openings) {
    if (o.kind !== 'window') continue
    const p = new THREE.Path()
    p.moveTo(o.u - o.w / 2, o.v0)
    p.lineTo(o.u + o.w / 2, o.v0)
    p.lineTo(o.u + o.w / 2, o.v1)
    p.lineTo(o.u - o.w / 2, o.v1)
    p.closePath()
    s.holes.push(p)
  }
  return s
}

const WALL_POSE: Record<WallId, (w: number, d: number) => { pos: [number, number, number]; rot: number; normal: [number, number, number] }> = {
  N: (_w, d) => ({ pos: [0, 0, -d / 2], rot: 0, normal: [0, 0, 1] }),
  S: (_w, d) => ({ pos: [0, 0, d / 2], rot: Math.PI, normal: [0, 0, -1] }),
  W: (w) => ({ pos: [-w / 2, 0, 0], rot: Math.PI / 2, normal: [1, 0, 0] }),
  E: (w) => ({ pos: [w / 2, 0, 0], rot: -Math.PI / 2, normal: [-1, 0, 0] }),
}

/** Zobrazí děti jen tehdy, když se kamera dívá na vnitřní stranu stěny (stěny odvrácené k divákovi jsou skryté). */
function FacingOnly({ normal, origin, children }: { normal: [number, number, number]; origin: [number, number, number]; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    const g = ref.current
    if (!g) return
    const dot = (camera.position.x - origin[0]) * normal[0] + (camera.position.y - origin[1]) * normal[1] + (camera.position.z - origin[2]) * normal[2]
    g.visible = dot > 0
  })
  return <group ref={ref}>{children}</group>
}
const WALL_KEYS: WallId[] = ['N', 'E', 'S', 'W']

export function useRoomGeometry(d: Design) {
  const { w, d: depth, h } = d.room
  const key = `${w}|${depth}|${h}|${d.windowWall}|${d.doorWall}`
  const geo = useMemo(() => {
    const walls = {} as Record<WallId, THREE.ShapeGeometry>
    for (const k of WALL_KEYS) walls[k] = new THREE.ShapeGeometry(wallShape(wallLength(d, k), h, openingsFor(d, k)))
    const rect = new THREE.Shape()
    rect.moveTo(-w / 2, -depth / 2)
    rect.lineTo(w / 2, -depth / 2)
    rect.lineTo(w / 2, depth / 2)
    rect.lineTo(-w / 2, depth / 2)
    rect.closePath()
    const plane = new THREE.ShapeGeometry(rect)
    const outlines = {} as Record<WallId, THREE.Vector3[][]>
    for (const k of WALL_KEYS) {
      const { shape, holes } = wallShape(wallLength(d, k), h, openingsFor(d, k)).extractPoints(1)
      outlines[k] = [shape, ...holes].map((ring) => [...ring, ring[0]].map((p) => new THREE.Vector3(p.x, p.y, 0.006)))
    }
    const ceilingOutline = [[-w / 2, -depth / 2], [w / 2, -depth / 2], [w / 2, depth / 2], [-w / 2, depth / 2], [-w / 2, -depth / 2]].map(([x, y]) => new THREE.Vector3(x, y, 0.006))
    return { walls, plane, outlines, ceilingOutline }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => () => {
    Object.values(geo.walls).forEach((g) => g.dispose())
    geo.plane.dispose()
  }, [geo])
  return geo
}

type RoomGeo = ReturnType<typeof useRoomGeometry>

/* ───────── materiál s plynulým přelivem barvy ───────── */

function PaintMaterial({ style }: { style: SurfaceStyle }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  const target = useMemo(() => new THREE.Color(style.hex), [style.hex])
  const tex = useMemo(() => surfaceTextures(style.texture), [style.texture])
  const finish = FINISHES.find((f) => f.id === style.finish)!
  const gold = style.texture === 'gold'
  const venetian = style.texture === 'venetian'

  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    m.color.lerp(target, 1 - Math.exp(-Math.min(dt, 0.1) * 7))
  })

  return (
    <meshStandardMaterial
      key={style.texture}
      ref={ref}
      color={style.hex}
      roughness={gold ? 0.38 : venetian ? Math.min(finish.roughness, 0.45) : finish.roughness}
      metalness={gold ? 0.85 : 0}
      map={tex?.map ?? null}
      bumpMap={tex?.bump ?? null}
      bumpScale={tex?.bumpScale ?? 0}
    />
  )
}

/* ───────── přemalovatelné plochy ───────── */

interface SurfacesProps {
  design: Design
  styles: Design['surfaces']
  geo: RoomGeo
  layer?: number
  interactive?: boolean
  selected?: SurfaceId[]
  onSelect?: (id: SurfaceId, additive: boolean) => void
}

export function PaintedSurfaces({ design, styles, geo, layer = 0, interactive, selected = [], onSelect }: SurfacesProps) {
  const [hover, setHover] = useState<SurfaceId | null>(null)
  const { w, d, h } = design.room

  useEffect(() => {
    if (!interactive) return
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => { document.body.style.cursor = '' }
  }, [hover, interactive])

  const handlers = (id: SurfaceId) =>
    interactive
      ? {
          onClick: (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            onSelect?.(id, e.nativeEvent.shiftKey || e.nativeEvent.ctrlKey || e.nativeEvent.metaKey)
          },
          onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(id) },
          onPointerOut: () => setHover((c) => (c === id ? null : c)),
        }
      : {}

  const outlineColor = (id: SurfaceId) => (selected.includes(id) ? '#2457ff' : hover === id ? '#ffffff' : null)

  return (
    <group layers={layer}>
      {WALL_KEYS.map((k) => {
        const id = WALL_SURFACE[k]
        const pose = WALL_POSE[k](w, d)
        return (
          <group key={k} position={pose.pos} rotation={[0, pose.rot, 0]} layers={layer}>
            <mesh geometry={geo.walls[k]} receiveShadow castShadow layers={layer} {...handlers(id)}>
              <PaintMaterial style={styles[id]} />
            </mesh>
            {interactive && outlineColor(id) && (
              <FacingOnly normal={pose.normal} origin={pose.pos}>
                {geo.outlines[k].map((pts, n) => (
                  <Line key={n} points={pts} color={outlineColor(id)!} lineWidth={2.5} layers={layer} />
                ))}
              </FacingOnly>
            )}
          </group>
        )
      })}

      <mesh geometry={geo.plane} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow layers={layer} {...handlers('ceiling')}>
        <PaintMaterial style={styles.ceiling} />
      </mesh>
      {interactive && outlineColor('ceiling') && (
        <group position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <FacingOnly normal={[0, -1, 0]} origin={[0, h, 0]}>
            <Line points={geo.ceilingOutline} color={outlineColor('ceiling')!} lineWidth={2.5} layers={layer} />
          </FacingOnly>
        </group>
      )}

      <Baseboards design={design} style={styles.trim} layer={layer} handlers={handlers('trim')} marked={!!interactive && selected.includes('trim')} />
    </group>
  )
}

function Baseboards({ design, style, layer, handlers, marked }: { design: Design; style: SurfaceStyle; layer: number; handlers: object; marked: boolean }) {
  const { w, d } = design.room
  const BH = 0.09
  const BT = 0.018
  const segs = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number; len: number }[] = []
    for (const k of WALL_KEYS) {
      const L = wallLength(design, k)
      const pose = WALL_POSE[k](w, d)
      const door = openingsFor(design, k).find((o) => o.kind === 'door')
      const ranges: [number, number][] = door ? [[-L / 2, door.u - door.w / 2], [door.u + door.w / 2, L / 2]] : [[-L / 2, L / 2]]
      for (const [a, b] of ranges) {
        if (b - a < 0.05) continue
        const c = (a + b) / 2
        // lokální osa x → světové souřadnice podle natočení stěny
        const cos = Math.cos(pose.rot), sin = Math.sin(pose.rot)
        out.push({ pos: [pose.pos[0] + c * cos + BT / 2 * sin, BH / 2, pose.pos[2] - c * sin + (BT / 2) * cos], rot: pose.rot, len: b - a })
      }
    }
    return out
  }, [design, w, d])
  const edges = useMemo(() => (marked ? segs.map((s) => new THREE.EdgesGeometry(new THREE.BoxGeometry(s.len, BH, BT))) : []), [segs, marked])
  useEffect(() => () => edges.forEach((g) => g.dispose()), [edges])
  return (
    <group layers={layer}>
      {segs.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[0, s.rot, 0]} receiveShadow layers={layer} {...handlers}>
          <boxGeometry args={[s.len, BH, BT]} />
          <PaintMaterial style={style} />
          {marked && edges[i] && (
            <lineSegments geometry={edges[i]} layers={layer} renderOrder={5}>
              <lineBasicMaterial color="#2457ff" depthTest={false} />
            </lineSegments>
          )}
        </mesh>
      ))}
    </group>
  )
}

/* ───────── sdílená část: podlaha, okno, dveře, obruba ───────── */

export function RoomShell({ design, geo, outside = false }: { design: Design; geo: RoomGeo; outside?: boolean }) {
  const { w, d, h } = design.room
  const tex = useMemo(() => floorTexture(design.floor), [design.floor])
  const t = 0.12

  return (
    <group>
      {/* podlaha – horní plocha v metrech, aby se deska nenatahovala */}
      <mesh geometry={geo.plane} position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial key={design.floor} map={tex.map} bumpMap={tex.bump} bumpScale={tex.bumpScale} roughnessMap={tex.rough} roughness={1} />
      </mesh>
      <mesh position={[0, -0.112, 0]} receiveShadow>
        <boxGeometry args={[w + t * 2, 0.22, d + t * 2]} />
        <meshStandardMaterial color="#d9d4c7" roughness={0.9} />
      </mesh>

      {/* průsvitné „skleněné“ stěny – z venku naznačí tvar domečku, zevnitř je nevidět */}
      {WALL_KEYS.map((k) => {
        const pose = WALL_POSE[k](w, d)
        return (
          <mesh key={'g' + k} geometry={geo.walls[k]} position={pose.pos} rotation={[0, pose.rot, 0]} raycast={() => null}>
            <meshBasicMaterial color="#b7c7e6" side={THREE.BackSide} transparent opacity={0.14} depthWrite={false} toneMapped={false} />
          </mesh>
        )
      })}

      {/* horní obruba stěn – dojem „domečku“ */}
      {WALL_KEYS.map((k) => {
        const L = wallLength(design, k)
        const pose = WALL_POSE[k](w, d)
        return (
          <group key={k} position={pose.pos} rotation={[0, pose.rot, 0]}>
            <mesh position={[0, h + 0.02, -t / 2]}>
              <boxGeometry args={[L + t * 2, 0.04, t]} />
              <meshStandardMaterial color="#eeebe3" roughness={0.9} />
            </mesh>
            <FacingOnly normal={pose.normal} origin={pose.pos}>
              {openingsFor(design, k).map((o) => (o.kind === 'window' ? <WindowParts key="w" o={o} time={design.time} outside={outside} /> : <DoorParts key="d" o={o} />))}
            </FacingOnly>
          </group>
        )
      })}
    </group>
  )
}

function WindowParts({ o, time, outside }: { o: Opening; time: number; outside: boolean }) {
  const f = 0.06
  const h = o.v1 - o.v0
  const cy = o.v0 + h / 2
  const mat = <meshStandardMaterial color="#f4f2ec" roughness={0.45} />
  const land = useMemo(() => (outside ? landscapeTexture() : null), [outside])
  const k = 0.18 + 0.82 * sunFactor(time)
  const dusk = time > 18.5 || time < 7.5
  const tint = new THREE.Color(k, k * (dusk ? 0.9 : 1), k * (dusk ? 0.85 : 1))
  const depth = 0.16
  return (
    <group position={[o.u, 0, -0.02]}>
      {/* výhled ven – krajina za oknem */}
      {outside && (
        <mesh position={[0, cy + 0.25, -1.4]} raycast={() => null}>
          <planeGeometry args={[o.w * 2.6 + 1.6, h * 2.2 + 1.2]} />
          <meshBasicMaterial map={land} color={tint} />
        </mesh>
      )}
      {/* ostění – okno je zapuštěné ve zdi */}
      {[[-o.w / 2, cy, o.w, h], [o.w / 2, cy, o.w, h]].map(([x], i) => (
        <mesh key={'r' + i} position={[x as number, cy, -depth / 2]} raycast={() => null}>
          <boxGeometry args={[0.012, h, depth]} />
          <meshStandardMaterial color="#ece8df" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, o.v1, -depth / 2]} raycast={() => null}>
        <boxGeometry args={[o.w, 0.012, depth]} />
        <meshStandardMaterial color="#ece8df" roughness={0.9} />
      </mesh>
      <mesh position={[0, o.v1 - f / 2, 0]} castShadow>{<boxGeometry args={[o.w, f, 0.1]} />}{mat}</mesh>
      <mesh position={[0, o.v0 + f / 2, 0]} castShadow>{<boxGeometry args={[o.w, f, 0.1]} />}{mat}</mesh>
      <mesh position={[-o.w / 2 + f / 2, cy, 0]} castShadow>{<boxGeometry args={[f, h, 0.1]} />}{mat}</mesh>
      <mesh position={[o.w / 2 - f / 2, cy, 0]} castShadow>{<boxGeometry args={[f, h, 0.1]} />}{mat}</mesh>
      <mesh position={[0, cy, 0]} castShadow>{<boxGeometry args={[0.04, h, 0.08]} />}{mat}</mesh>
      <mesh position={[0, cy, -0.01]}>
        <planeGeometry args={[o.w - f * 2, h - f * 2]} />
        <meshStandardMaterial color="#cfe6f5" transparent opacity={0.14} roughness={0.05} depthWrite={false} />
      </mesh>
      <mesh position={[0, o.v0 - 0.015, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[o.w + 0.18, 0.035, 0.24]} />
        {mat}
      </mesh>
    </group>
  )
}

function DoorParts({ o }: { o: Opening }) {
  const h = o.v1 - o.v0
  return (
    <group position={[o.u, 0, -0.02]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[o.w - 0.04, h - 0.03, 0.04]} />
        <meshStandardMaterial color="#b38559" roughness={0.6} />
      </mesh>
      <mesh position={[o.w / 2 - 0.12, 1.0, 0.04]}>
        <sphereGeometry args={[0.03, 16, 12]} />
        <meshStandardMaterial color="#c8c8c8" metalness={0.9} roughness={0.25} />
      </mesh>
      {[[-o.w / 2 + 0.02, 0], [o.w / 2 - 0.02, 0]].map(([x], i) => (
        <mesh key={i} position={[x, h / 2, 0]}>
          <boxGeometry args={[0.05, h, 0.09]} />
          <meshStandardMaterial color="#f4f2ec" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, h - 0.025, 0]}>
        <boxGeometry args={[o.w, 0.05, 0.09]} />
        <meshStandardMaterial color="#f4f2ec" roughness={0.5} />
      </mesh>
    </group>
  )
}
