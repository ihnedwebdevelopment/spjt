import { useEffect, useMemo } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { openingsFor, skyStops, sunVector, wallLength } from '../lib/geometry'
import type { Design, WallId } from '../store/types'

RectAreaLightUniformsLib.init()

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function sunFactor(time: number) {
  return smooth(6, 7.2, time) * (1 - smooth(19.4, 20.9, time))
}

const AMBIENT_KEYS: [number, string][] = [
  [6, '#b9c8ff'], [8, '#ffeedc'], [13, '#ffffff'], [17, '#ffe4c4'], [19.5, '#f3ddcc'], [21, '#8a9bd0'],
]
function ambientColor(t: number) {
  for (let i = 0; i < AMBIENT_KEYS.length - 1; i++) {
    const [a, ca] = AMBIENT_KEYS[i], [b, cb] = AMBIENT_KEYS[i + 1]
    if (t >= a && t <= b) return new THREE.Color(ca).lerp(new THREE.Color(cb), (t - a) / (b - a))
  }
  return new THREE.Color('#ffffff')
}

export function Lighting({ design, shadowSize = 2048 }: { design: Design; shadowSize?: number }) {
  const { dir, elevation } = sunVector(design.time)
  const f = sunFactor(design.time)
  const { w, d, h } = design.room
  const warm = 1 - Math.min(1, Math.max(0, (elevation - 6) / 30))
  const color = new THREE.Color('#fff4e2').lerp(new THREE.Color('#ffa765'), warm * 0.7)
  const reach = Math.max(w, d) * 0.9 + 2.5
  const ambient = 0.45 + 1.25 * f
  const win = windowPose(design)
  const daylight = 0.25 + 0.75 * f

  return (
    <>
      <hemisphereLight args={[ambientColor(design.time), ambientColor(design.time).multiplyScalar(0.92), ambient]} />
      <directionalLight
        position={[dir[0] * 24, dir[1] * 24, dir[2] * 24]}
        intensity={f * (3.4 + (1 - warm) * 1.8)}
        color={color}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <Environment resolution={128} environmentIntensity={0.12 + 0.28 * f}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={1} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1} position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[0, 2, 6]} rotation-y={Math.PI} scale={[8, 4, 1]} />
      </Environment>

      {/* měkké denní světlo, které proudí oknem do místnosti */}
      {win && (
        <rectAreaLight
          position={win.pos}
          rotation={[0, win.rotY, 0]}
          width={win.w}
          height={win.h}
          color={new THREE.Color('#dfeaff').lerp(color, 0.35)}
          intensity={daylight * 5.5}
        />
      )}

      {design.lampsOn && (
        <>
          <pointLight position={[0, h - 0.35, 0]} color="#ffe3bf" intensity={12 * Math.max(1, (w * d) / 14)} distance={Math.max(w, d) * 2.4} decay={2} />
          <mesh position={[0, h - 0.04, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 24]} />
            <meshStandardMaterial color="#fff6e0" emissive="#ffd9a0" emissiveIntensity={2} />
          </mesh>
        </>
      )}
    </>
  )
}

/** Poloha okna ve světě – pro světlo z okna a výhled ven. */
export function windowPose(design: Design) {
  const k = design.windowWall as WallId
  const o = openingsFor(design, k).find((x) => x.kind === 'window')
  if (!o) return null
  const { w, d } = design.room
  const cy = (o.v0 + o.v1) / 2
  const inset = 0.02
  // rectAreaLight svítí ve směru své -z osy
  const P: Record<WallId, { pos: [number, number, number]; rotY: number }> = {
    N: { pos: [o.u, cy, -d / 2 + inset], rotY: Math.PI },
    S: { pos: [-o.u, cy, d / 2 - inset], rotY: 0 },
    W: { pos: [-w / 2 + inset, cy, -o.u], rotY: -Math.PI / 2 },
    E: { pos: [w / 2 - inset, cy, o.u], rotY: Math.PI / 2 },
  }
  void wallLength
  return { ...P[k], w: o.w, h: o.v1 - o.v0 }
}

/** Obloha jako pozadí scény (je pak i ve staženém obrázku). */
export function SkyBackground({ time }: { time: number }) {
  const scene = useThree((s) => s.scene)
  const key = Math.round(time * 4) / 4
  const tex = useMemo(() => {
    const [top, bottom] = skyStops(key)
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, top)
    g.addColorStop(1, bottom)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [key])
  useEffect(() => {
    scene.background = tex
    return () => {
      if (scene.background === tex) scene.background = null
      tex.dispose()
    }
  }, [scene, tex])
  return null
}
