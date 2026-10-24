import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox, useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { footprintOf } from '../store/designer'
import type { FurnitureItem } from '../store/types'

/* ───────── pomocné stavební prvky ───────── */

interface BoxProps {
  s: [number, number, number]
  p: [number, number, number]
  c: string
  r?: number
  rough?: number
}
const Box = ({ s, p, c, r = 0.02, rough = 0.85 }: BoxProps) => (
  <RoundedBox args={s} radius={Math.min(r, Math.min(...s) / 2 - 0.001)} smoothness={3} position={p} castShadow receiveShadow>
    <meshStandardMaterial color={c} roughness={rough} />
  </RoundedBox>
)

const shade = (hex: string, k: number) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString()

/* ───────── procedurální modely (přední strana = +z) ───────── */

function Sofa({ color }: { color: string }) {
  return (
    <group>
      <Box s={[2.1, 0.28, 0.92]} p={[0, 0.2, 0]} c={shade(color, 0.8)} r={0.04} />
      <Box s={[0.98, 0.18, 0.7]} p={[-0.5, 0.42, 0.08]} c={color} r={0.07} />
      <Box s={[0.98, 0.18, 0.7]} p={[0.5, 0.42, 0.08]} c={color} r={0.07} />
      <Box s={[2.1, 0.5, 0.2]} p={[0, 0.65, -0.37]} c={color} r={0.07} />
      <Box s={[0.18, 0.4, 0.92]} p={[-0.96, 0.5, 0]} c={shade(color, 0.92)} r={0.06} />
      <Box s={[0.18, 0.4, 0.92]} p={[0.96, 0.5, 0]} c={shade(color, 0.92)} r={0.06} />
      <Box s={[0.4, 0.34, 0.12]} p={[-0.6, 0.67, -0.2]} c={shade(color, 1.25)} r={0.05} />
      {[[-0.9, 0.4], [0.9, 0.4], [-0.9, -0.4], [0.9, -0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.025, 0.06, 10]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      ))}
    </group>
  )
}

function Armchair({ color }: { color: string }) {
  return (
    <group>
      <Box s={[0.9, 0.26, 0.9]} p={[0, 0.2, 0]} c={shade(color, 0.85)} r={0.05} />
      <Box s={[0.62, 0.16, 0.66]} p={[0, 0.4, 0.06]} c={color} r={0.06} />
      <Box s={[0.9, 0.5, 0.18]} p={[0, 0.62, -0.36]} c={color} r={0.07} />
      <Box s={[0.14, 0.34, 0.8]} p={[-0.38, 0.48, 0]} c={shade(color, 0.92)} r={0.05} />
      <Box s={[0.14, 0.34, 0.8]} p={[0.38, 0.48, 0]} c={shade(color, 0.92)} r={0.05} />
    </group>
  )
}

function Bed({ color }: { color: string }) {
  return (
    <group>
      <Box s={[1.7, 0.3, 2.1]} p={[0, 0.2, 0]} c="#7a5a42" r={0.03} />
      <Box s={[1.6, 0.22, 2.0]} p={[0, 0.46, 0.02]} c="#f1eee8" r={0.06} />
      <Box s={[1.62, 0.1, 1.2]} p={[0, 0.6, 0.38]} c={color} r={0.05} />
      <Box s={[1.7, 1.0, 0.1]} p={[0, 0.62, -1.0]} c="#7a5a42" r={0.03} />
      <Box s={[0.62, 0.14, 0.38]} p={[-0.4, 0.64, -0.7]} c="#ffffff" r={0.06} />
      <Box s={[0.62, 0.14, 0.38]} p={[0.4, 0.64, -0.7]} c="#ffffff" r={0.06} />
    </group>
  )
}

function Chair({ color, p, rot = 0 }: { color: string; p: [number, number, number]; rot?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box s={[0.42, 0.05, 0.42]} p={[0, 0.45, 0]} c={color} r={0.015} />
      <Box s={[0.42, 0.45, 0.04]} p={[0, 0.7, -0.19]} c={color} r={0.015} />
      {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z], i) => (
        <Box key={i} s={[0.04, 0.45, 0.04]} p={[x, 0.225, z]} c={shade(color, 0.8)} r={0.01} />
      ))}
    </group>
  )
}

function Table({ color }: { color: string }) {
  return (
    <group>
      <Box s={[1.4, 0.05, 0.85]} p={[0, 0.74, 0]} c={color} r={0.02} rough={0.55} />
      {[[-0.62, -0.35], [0.62, -0.35], [-0.62, 0.35], [0.62, 0.35]].map(([x, z], i) => (
        <Box key={i} s={[0.07, 0.72, 0.07]} p={[x, 0.36, z]} c={shade(color, 0.8)} r={0.015} />
      ))}
      <Chair color="#d8d2c6" p={[-0.35, 0, 0.62]} rot={Math.PI} />
      <Chair color="#d8d2c6" p={[0.35, 0, 0.62]} rot={Math.PI} />
      <Chair color="#d8d2c6" p={[-0.35, 0, -0.62]} />
      <Chair color="#d8d2c6" p={[0.35, 0, -0.62]} />
      <mesh position={[0, 0.84, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.14, 14]} />
        <meshStandardMaterial color="#c9d6dd" roughness={0.2} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function Desk({ color }: { color: string }) {
  return (
    <group>
      <Box s={[1.4, 0.04, 0.7]} p={[0, 0.74, -0.2]} c={color} r={0.015} rough={0.55} />
      <Box s={[0.05, 0.72, 0.65]} p={[-0.65, 0.36, -0.2]} c={shade(color, 0.85)} r={0.01} />
      <Box s={[0.05, 0.72, 0.65]} p={[0.65, 0.36, -0.2]} c={shade(color, 0.85)} r={0.01} />
      <Box s={[0.5, 0.3, 0.03]} p={[0, 1.02, -0.38]} c="#1c1c1e" r={0.01} />
      <Box s={[0.06, 0.18, 0.06]} p={[0, 0.85, -0.38]} c="#444" r={0.01} />
      <Chair color="#3f4a5a" p={[0, 0, 0.45]} rot={Math.PI} />
    </group>
  )
}

function Shelf({ color }: { color: string }) {
  const books = useMemo(() => {
    const cols = ['#b8325a', '#2f6b72', '#e0b256', '#e9e5d9', '#5d3b66', '#7b8051', '#c0674a']
    const out: { x: number; y: number; w: number; h: number; c: string }[] = []
    for (let row = 0; row < 4; row++) {
      let x = -0.4
      while (x < 0.38) {
        const w = 0.04 + ((row * 7 + Math.floor((x + 1) * 17)) % 4) * 0.012
        const h = 0.22 + ((row * 3 + Math.floor((x + 1) * 31)) % 5) * 0.02
        if (((Math.floor((x + 1) * 13) + row) % 5) !== 0) out.push({ x: x + w / 2, y: 0.12 + row * 0.44, w, h, c: cols[(Math.floor((x + 1) * 29) + row) % cols.length] })
        x += w + 0.004
      }
    }
    return out
  }, [])
  return (
    <group>
      <Box s={[1.0, 1.9, 0.02]} p={[0, 0.95, -0.17]} c={shade(color, 0.85)} r={0.005} />
      <Box s={[0.03, 1.9, 0.36]} p={[-0.485, 0.95, 0]} c={color} r={0.008} />
      <Box s={[0.03, 1.9, 0.36]} p={[0.485, 0.95, 0]} c={color} r={0.008} />
      {[0.02, 0.46, 0.9, 1.34, 1.78].map((y, i) => (
        <Box key={i} s={[1.0, 0.03, 0.36]} p={[0, y + 0.015, 0]} c={color} r={0.008} />
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y + b.h / 2 + 0.03, 0.02]} castShadow>
          <boxGeometry args={[b.w, b.h, 0.22]} />
          <meshStandardMaterial color={b.c} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Wardrobe({ color }: { color: string }) {
  return (
    <group>
      <Box s={[1.3, 2.1, 0.6]} p={[0, 1.05, 0]} c={color} r={0.012} rough={0.6} />
      <Box s={[0.012, 1.98, 0.02]} p={[0, 1.05, 0.3]} c={shade(color, 0.6)} r={0.003} />
      <Box s={[0.02, 0.4, 0.03]} p={[-0.05, 1.05, 0.31]} c="#9a9a9a" r={0.005} />
      <Box s={[0.02, 0.4, 0.03]} p={[0.05, 1.05, 0.31]} c="#9a9a9a" r={0.005} />
    </group>
  )
}

function TvUnit({ color }: { color: string }) {
  return (
    <group>
      <Box s={[1.6, 0.42, 0.42]} p={[0, 0.26, 0]} c="#a98862" r={0.012} rough={0.55} />
      {[[-0.7, 0.15], [0.7, 0.15], [-0.7, -0.15], [0.7, -0.15]].map(([x, z], i) => (
        <Box key={i} s={[0.03, 0.05, 0.03]} p={[x, 0.025, z]} c="#222" r={0.005} />
      ))}
      <Box s={[1.25, 0.72, 0.04]} p={[0, 0.9, 0]} c={color} r={0.01} rough={0.2} />
      <Box s={[0.18, 0.14, 0.12]} p={[0, 0.5, 0]} c="#1c1c1e" r={0.01} />
    </group>
  )
}

function Plant({ color }: { color: string }) {
  const leaves = useMemo(
    () => Array.from({ length: 11 }, (_, i) => ({ a: (i / 11) * Math.PI * 2, t: 0.25 + ((i * 37) % 10) / 24, h: 0.55 + ((i * 53) % 10) / 22 })),
    [],
  )
  return (
    <group>
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.34, 20]} />
        <meshStandardMaterial color="#c9c1b2" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.185, 0.185, 0.02, 20]} />
        <meshStandardMaterial color="#3b2a20" roughness={1} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} position={[Math.cos(l.a) * 0.1, 0.34 + l.h / 2, Math.sin(l.a) * 0.1]} rotation={[Math.sin(l.a) * l.t, 0, -Math.cos(l.a) * l.t]} castShadow>
          <coneGeometry args={[0.1, l.h, 6]} />
          <meshStandardMaterial color={shade(color, 0.8 + (i % 3) * 0.15)} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function Lamp({ color, on }: { color: string; on: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 20]} />
        <meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.013, 0.013, 1.55, 8]} />
        <meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.13, 0.2, 0.26, 24, 1, true]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} emissive={on ? '#ffd79a' : '#000000'} emissiveIntensity={on ? 2.4 : 0} roughness={0.9} />
      </mesh>
      {on && <pointLight position={[0, 1.5, 0]} color="#ffd9a8" intensity={3.2} distance={4.5} decay={2} />}
      {on && <pointLight position={[0, 1.55, 0]} color="#ffcf87" intensity={7} distance={7} decay={2} />}
    </group>
  )
}

function Rug({ color }: { color: string }) {
  return (
    <group>
      <Box s={[2.2, 0.018, 1.5]} p={[0, 0.009, 0]} c={color} r={0.008} />
      <Box s={[1.9, 0.02, 1.2]} p={[0, 0.011, 0]} c={shade(color, 0.88)} r={0.008} />
    </group>
  )
}

/* ───────── vlastní .glb ───────── */

class ModelBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

function CustomModel({ item, onMeasured }: { item: FurnitureItem; onMeasured: (size: [number, number]) => void }) {
  const gltf = useGLTF(item.url!)
  const { object, size } = useMemo(() => {
    const clone = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const sz = box.getSize(new THREE.Vector3())
    const biggest = Math.max(sz.x, sz.y, sz.z) || 1
    // modely v „nesmyslném“ měřítku (mm, cm) srovnáme na rozumných ~1,2 m
    const k = biggest > 0.25 && biggest < 4 ? 1 : 1.2 / biggest
    clone.scale.setScalar(k)
    const b2 = new THREE.Box3().setFromObject(clone)
    const c = b2.getCenter(new THREE.Vector3())
    clone.position.set(-c.x, -b2.min.y, -c.z)
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    const fin = b2.getSize(new THREE.Vector3())
    return { object: clone, size: [fin.x, fin.z] as [number, number] }
  }, [gltf])
  useEffect(() => onMeasured(size), [size, onMeasured])
  return <primitive object={object} />
}

/* ───────── vrstva nábytku s výběrem a tažením ───────── */

function Model({ item, lampsOn, onBroken, onMeasured }: { item: FurnitureItem; lampsOn: boolean; onBroken: () => void; onMeasured: (s: [number, number]) => void }) {
  switch (item.type) {
    case 'sofa': return <Sofa color={item.color} />
    case 'armchair': return <Armchair color={item.color} />
    case 'bed': return <Bed color={item.color} />
    case 'table': return <Table color={item.color} />
    case 'desk': return <Desk color={item.color} />
    case 'shelf': return <Shelf color={item.color} />
    case 'wardrobe': return <Wardrobe color={item.color} />
    case 'tv': return <TvUnit color={item.color} />
    case 'plant': return <Plant color={item.color} />
    case 'lamp': return <Lamp color={item.color} on={lampsOn} />
    case 'rug': return <Rug color={item.color} />
    case 'custom':
      return (
        <ModelBoundary onError={onBroken}>
          <Suspense fallback={null}>
            <CustomModel item={item} onMeasured={onMeasured} />
          </Suspense>
        </ModelBoundary>
      )
  }
}

interface LayerProps {
  items: FurnitureItem[]
  lampsOn: boolean
  selectedId?: string | null
  interactive?: boolean
  onPick?: (id: string, e: ThreeEvent<PointerEvent>) => void
  onBroken?: (id: string) => void
  onMeasured?: (id: string, s: [number, number]) => void
  /** [x, z, poloměr] – nábytek uvnitř tohoto kruhu se skryje (kamera uvnitř místnosti) */
  hideNear?: [number, number, number] | null
}

export function FurnitureLayer({ items, lampsOn, selectedId, interactive, onPick, onBroken, onMeasured, hideNear }: LayerProps) {
  return (
    <group>
      {items.map((f) => {
        const [fw, fd] = footprintOf(f)
        const hidden = !!hideNear && f.type !== 'rug' && Math.hypot(f.x - hideNear[0], f.z - hideNear[1]) < hideNear[2] + Math.max(fw, fd) / 2
        const selected = selectedId === f.id
        return (
          <group
            key={f.id}
            visible={!hidden}
            position={[f.x, f.type === 'rug' ? 0.006 : 0, f.z]}
            rotation={[0, (f.rot * Math.PI) / 2, 0]}
            onPointerDown={interactive ? (e) => { e.stopPropagation(); onPick?.(f.id, e) } : undefined}
            onPointerOver={interactive ? (e) => { e.stopPropagation(); document.body.style.cursor = 'grab' } : undefined}
            onPointerOut={interactive ? () => { document.body.style.cursor = '' } : undefined}
          >
            <Model item={f} lampsOn={lampsOn} onBroken={() => onBroken?.(f.id)} onMeasured={(s) => onMeasured?.(f.id, s)} />
            {selected && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
                <ringGeometry args={[Math.hypot(fw, fd) / 2 + 0.02, Math.hypot(fw, fd) / 2 + 0.06, 48]} />
                <meshBasicMaterial color="#2457ff" transparent opacity={0.85} depthWrite={false} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}
