import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { surfaceTextures } from '../lib/textures'

function Slab({ kind, hex }: { kind: 'concrete' | 'venetian' | 'gold'; hex: string }) {
  const tex = useMemo(() => surfaceTextures(kind)!, [kind])
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(4.6, 4.0)
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4.6, uv.getY(i) * 4.0)
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  const light = useRef<THREE.PointLight>(null)
  const mesh = useRef<THREE.Mesh>(null)

  useFrame((state, dt) => {
    const l = light.current
    if (!l) return
    const tx = state.pointer.x * 2.6, ty = state.pointer.y * 2.2
    l.position.x += (tx - l.position.x) * (1 - Math.exp(-dt * 8))
    l.position.y += (ty - l.position.y) * (1 - Math.exp(-dt * 8))
    if (mesh.current) {
      mesh.current.rotation.y += (state.pointer.x * 0.12 - mesh.current.rotation.y) * (1 - Math.exp(-dt * 4))
      mesh.current.rotation.x += (-state.pointer.y * 0.1 - mesh.current.rotation.x) * (1 - Math.exp(-dt * 4))
    }
  })

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight ref={light} position={[0, 0, 0.9]} intensity={14} distance={9} decay={1.6} color="#fff1da" />
      <mesh ref={mesh} geometry={geo}>
        <meshStandardMaterial
          key={kind}
          color={hex}
          map={tex.map}
          bumpMap={tex.bump}
          bumpScale={tex.bumpScale * 2.4}
          roughness={kind === 'gold' ? 0.34 : kind === 'venetian' ? 0.38 : 0.92}
          metalness={kind === 'gold' ? 0.9 : 0}
        />
      </mesh>
      <Environment resolution={64} environmentIntensity={kind === 'gold' ? 0.9 : 0.25}>
        <Lightformer form="rect" intensity={3} position={[0, 3, 4]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-4, -1, 3]} scale={[2, 6, 1]} />
      </Environment>
    </>
  )
}

export default function FinishCanvas({ kind, hex }: { kind: 'concrete' | 'venetian' | 'gold'; hex: string }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ fov: 38, position: [0, 0, 5.2] }} gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping }}>
      <color attach="background" args={['#1b1d24']} />
      <Slab kind={kind} hex={hex} />
    </Canvas>
  )
}
