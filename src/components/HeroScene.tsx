import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { PRESETS } from '../data/presets'
import { PaintedSurfaces, RoomShell, useRoomGeometry } from '../designer/Room'
import { FurnitureLayer } from '../designer/Furniture'
import { Lighting } from '../designer/Lighting'
import type { Design } from '../store/types'
import type { HeroLook } from '../data/heroLooks'

function Rig({ children, scrollLinked }: { children: React.ReactNode; scrollLinked: boolean }) {
  const group = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const t = useRef(0)
  const calm = useMemo(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    if (!calm) t.current += dt
    const scroll = scrollLinked ? Math.min(1, window.scrollY / Math.max(1, window.innerHeight)) : 0
    const wide = size.width / size.height > 1.15
    const px = calm ? 0 : state.pointer.x, py = calm ? 0 : state.pointer.y
    const targetY = -0.62 + Math.sin(t.current * 0.22) * 0.18 + px * 0.28 + scroll * 1.3
    g.rotation.y += (targetY - g.rotation.y) * (1 - Math.exp(-dt * 3))
    const tx = wide && scrollLinked ? 0.2 : 0
    g.position.x += (tx - scroll * 0.6 - g.position.x) * (1 - Math.exp(-dt * 4))
    g.position.y += ((scrollLinked ? -0.9 : -1.05) - scroll * 0.8 - g.position.y) * (1 - Math.exp(-dt * 4))
    const s = scrollLinked ? (wide ? 0.95 : 0.8) * (1 - scroll * 0.25) : 1.12
    g.scale.setScalar(g.scale.x + (s - g.scale.x) * (1 - Math.exp(-dt * 4)))
    const cy = 7.2 + py * 1.1 - scroll * 1.5
    camera.position.y += (cy - camera.position.y) * (1 - Math.exp(-dt * 3))
    camera.lookAt(0, 0.2, 0)
  })
  return <group ref={group}>{children}</group>
}

function HeroRoom({ look }: { look: HeroLook }) {
  const base = useMemo<Design>(() => {
    const d = PRESETS[0].make()
    d.time = 15.2
    return d
  }, [])
  const surfaces = useMemo(() => ({ ...base.surfaces, wallW: look.walls, wallE: look.walls, wallS: look.walls, wallN: look.accent, ceiling: look.ceiling }), [base, look])
  const geo = useRoomGeometry(base)
  return (
    <>
      <Lighting design={base} shadowSize={1024} />
      <RoomShell design={base} geo={geo} />
      <PaintedSurfaces design={base} styles={surfaces} geo={geo} />
      <FurnitureLayer items={base.furniture} lampsOn={false} />
      <ContactShadows position={[0, 0.004, 0]} opacity={0.5} scale={9} blur={2.4} far={1.4} resolution={512} />
    </>
  )
}

export default function HeroScene({ look, active, scrollLinked = true }: { look: HeroLook; active: boolean; scrollLinked?: boolean }) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) return null
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.6]}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 30, near: 0.1, far: 100, position: [7.2, 7.2, 10.5] }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping }}
    >
      <Rig scrollLinked={scrollLinked}>
        <HeroRoom look={look} />
      </Rig>
    </Canvas>
  )
}
