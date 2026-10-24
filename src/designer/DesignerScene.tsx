import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { CameraControls, ContactShadows, PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { CameraControls as CameraControlsImpl } from '@react-three/drei'
import { useDesigner } from '../store/designer'
import { PaintedSurfaces, RoomShell, useRoomGeometry } from './Room'
import { FurnitureLayer } from './Furniture'
import { Lighting, SkyBackground } from './Lighting'
import type { Design, ViewMode } from '../store/types'

/* ───────── kamera ───────── */

function CameraRig({ room, view }: { room: Design['room']; view: ViewMode }) {
  const ref = useRef<CameraControlsImpl>(null)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const aspectRef = useRef(1.5)
  aspectRef.current = size.width / Math.max(1, size.height)
  const { w, d, h } = room

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const R = Math.max(w, d)
    if (view === 'inside') {
      camera.fov = 74
      camera.updateProjectionMatrix()
      c.minDistance = 0.01
      c.maxDistance = 0.01
      c.dollySpeed = 0
      c.truckSpeed = 0
      c.minPolarAngle = 0.3
      c.maxPolarAngle = Math.PI - 0.5
      const px = w / 2 - 0.45, pz = d / 2 - 0.45, py = 1.55
      const dir = new THREE.Vector3(-w / 2 - px, 1.1 - py, -d / 2 - pz).normalize().multiplyScalar(0.01)
      void c.setLookAt(px, py, pz, px + dir.x, py + dir.y, pz + dir.z, true)
    } else {
      camera.fov = 38
      camera.updateProjectionMatrix()
      c.dollySpeed = 1
      c.truckSpeed = 2
      c.minDistance = 3
      c.maxDistance = 34
      c.minPolarAngle = view === 'top' ? 0 : 0.05
      c.maxPolarAngle = Math.PI * 0.495
      const aspect = aspectRef.current
      const k = aspect < 1.4 ? Math.min(1.9, Math.pow(1.4 / aspect, 0.85)) : 1
      if (view === 'model') void c.setLookAt((R * 0.78 + 2.2) * k, (h * 1.45 + R * 0.42) * k, (R * 0.9 + 2.6) * k, 0, h * 0.36, 0, true)
      else void c.setLookAt(0.001, (R * 1.9 + 4) * k, 0.002, 0, 0, 0, true)
    }
  }, [view, w, d, h, camera])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const off = (v: boolean) => { c.enabled = v }
    ;(window as unknown as { __spejtekCam?: (v: boolean) => void }).__spejtekCam = off
    return () => { delete (window as unknown as { __spejtekCam?: unknown }).__spejtekCam }
  }, [])

  return <CameraControls ref={ref} makeDefault smoothTime={0.25} />
}

/* ───────── kvalita vykreslení ───────── */

export type Quality = 'high' | 'medium' | 'low'

/** Výchozí kvalita podle zařízení; PerformanceMonitor ji za běhu případně sníží. */
function initialQuality(): Quality {
  if (typeof navigator === 'undefined') return 'high'
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency ?? 4
  if (coarse) return cores >= 6 ? 'medium' : 'low'
  return cores >= 4 ? 'high' : 'medium'
}

/** Fotorealistický průchod: ambientní okluze, záře světel, tónování, vyhlazení. */
function Effects({ quality }: { quality: Quality }) {
  const camera = useThree((s) => s.camera)
  useEffect(() => { camera.layers.set(0) }, [camera])
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO
        aoRadius={0.55}
        distanceFalloff={0.6}
        intensity={quality === 'low' ? 2.2 : 2.8}
        quality={quality === 'high' ? 'high' : quality === 'medium' ? 'medium' : 'performance'}
        halfRes={quality !== 'high'}
        depthAwareUpsampling
        color="#1a140c"
      />
      <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.2} intensity={0.55} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
    </EffectComposer>
  )
}

/** Rozdělené před/po: dvě poloviny stejné kamery, každá s jinou vrstvou nátěru. */
function SplitRenderer() {
  useFrame(({ gl, scene, camera, size }) => {
    const { split } = useDesigner.getState()
    const x = Math.round(size.width * split)
    const tm = gl.toneMapping
    gl.toneMapping = THREE.NeutralToneMapping
    gl.setScissorTest(true)
    camera.layers.set(0)
    camera.layers.enable(1)
    gl.setScissor(0, 0, x, size.height)
    gl.render(scene, camera)
    camera.layers.set(0)
    camera.layers.enable(2)
    gl.setScissor(x, 0, size.width - x, size.height)
    gl.render(scene, camera)
    gl.setScissorTest(false)
    gl.toneMapping = tm
    // vrstva 2 zůstává aktivní, aby fungovalo klikání na „po“ stěny
  }, 1)
  return null
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Nabídne rodiči čistý snímek návrhu – bez obrysů výběru, v plné kvalitě. */
function Capture({ register }: { register: (fn: (() => Promise<string>) | null) => void }) {
  const gl = useThree((s) => s.gl)
  const setDpr = useThree((s) => s.setDpr)
  const viewport = useThree((s) => s.viewport)
  useEffect(() => {
    register(async () => {
      const st = useDesigner.getState()
      const wasCompare = st.compare
      const prevDpr = viewport.dpr
      useDesigner.setState({ capturing: true, compare: false })
      setDpr(Math.min(2.5, Math.max(2, prevDpr))) // export v ostrém rozlišení
      for (let i = 0; i < 6; i++) await nextFrame()
      const url = gl.domElement.toDataURL('image/jpeg', 0.94)
      setDpr(prevDpr)
      useDesigner.setState({ capturing: false, compare: wasCompare })
      return url
    })
    return () => register(null)
  }, [gl, register, setDpr, viewport.dpr])
  return null
}

/* ───────── scéna ───────── */

function Scene({ register, quality }: { register: (fn: (() => Promise<string>) | null) => void; quality: Quality }) {
  const design = useDesigner((s) => s.design)
  const capturing = useDesigner((s) => s.capturing)
  const selected = useDesigner((s) => (s.capturing ? NONE : s.selected))
  const selectedFurniture = useDesigner((s) => s.selectedFurniture)
  const compare = useDesigner((s) => s.compare)
  const view = useDesigner((s) => s.view)
  const geo = useRoomGeometry(design)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  const drag = useRef<{ id: string; dx: number; dz: number } | null>(null)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])

  const ground = (ev: PointerEvent) => {
    const r = gl.domElement.getBoundingClientRect()
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    return ray.ray.intersectPlane(plane, hit)
  }

  const setCam = (v: boolean) => (window as unknown as { __spejtekCam?: (v: boolean) => void }).__spejtekCam?.(v)

  const onPick = (id: string, e: ThreeEvent<PointerEvent>) => {
    const st = useDesigner.getState()
    st.selectFurniture(id)
    const item = st.design.furniture.find((f) => f.id === id)
    const p = ground(e.nativeEvent)
    if (!item || !p) return
    drag.current = { id, dx: item.x - p.x, dz: item.z - p.z }
    setCam(false)
    const move = (ev: PointerEvent) => {
      const g = ground(ev)
      if (g && drag.current) useDesigner.getState().moveFurniture(drag.current.id, g.x + drag.current.dx, g.z + drag.current.dz)
    }
    const up = () => {
      drag.current = null
      setCam(true)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const st = useDesigner.getState()
  const onSelect = (id: Parameters<typeof st.select>[0], additive: boolean) => useDesigner.getState().select(id, additive)

  return (
    <>
      {compare && !capturing ? <SplitRenderer /> : <Effects quality={quality} />}
      <Capture register={register} />
      <SkyBackground time={design.time} />
      <CameraRig room={design.room} view={view} />
      <Lighting design={design} shadowSize={quality === 'high' ? 4096 : quality === 'medium' ? 2048 : 1024} />
      <RoomShell design={design} geo={geo} outside={view === 'inside'} />

      {compare ? (
        <>
          <PaintedSurfaces design={design} styles={design.before} geo={geo} layer={1} />
          <PaintedSurfaces design={design} styles={design.surfaces} geo={geo} layer={2} interactive selected={selected} onSelect={onSelect} />
        </>
      ) : (
        <PaintedSurfaces design={design} styles={design.surfaces} geo={geo} layer={0} interactive selected={selected} onSelect={onSelect} />
      )}

      <FurnitureLayer
        items={design.furniture}
        lampsOn={design.lampsOn}
        selectedId={capturing ? null : selectedFurniture}
        hideNear={view === 'inside' ? [design.room.w / 2 - 0.45, design.room.d / 2 - 0.45, 0.9] : null}
        interactive
        onPick={onPick}
        onBroken={(id) => {
          useDesigner.getState().removeFurniture(id)
          useDesigner.getState().say('Model se nepodařilo načíst. Zkuste jiný soubor .glb.')
        }}
        onMeasured={(id, s) => {
          const f = useDesigner.getState().design.furniture.find((x) => x.id === id)
          if (f && (!f.size || Math.abs(f.size[0] - s[0]) > 0.01 || Math.abs(f.size[1] - s[1]) > 0.01)) useDesigner.getState().setFurnitureSize(id, s)
        }}
      />
      <ContactShadows position={[0, 0.004, 0]} opacity={0.35} scale={Math.max(design.room.w, design.room.d) + 1} blur={2.6} far={1.2} resolution={quality === 'low' ? 256 : 512} />
    </>
  )
}

const NONE: never[] = []

export default function DesignerScene({ register }: { register: (fn: (() => Promise<string>) | null) => void }) {
  const [quality, setQuality] = useState<Quality>(initialQuality)
  const dpr: [number, number] = quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [1, 1.25]
  return (
    <Canvas
      shadows="percentage"
      dpr={dpr}
      camera={{ fov: 38, near: 0.05, far: 200, position: [8, 6, 9] }}
      gl={{ antialias: false, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
      onPointerMissed={() => useDesigner.getState().selectFurniture(null)}
    >
      <PerformanceMonitor
        flipflops={2}
        onDecline={() => setQuality((q) => (q === 'high' ? 'medium' : 'low'))}
      >
        <Scene register={register} quality={quality} />
      </PerformanceMonitor>
    </Canvas>
  )
}
