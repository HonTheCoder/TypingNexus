// ─────────────────────────────────────────────────────────────────────────────
// components/three/ParticleGrid.jsx
//
// Changes vs original:
//   - useFrame callback guards against a null / disposed geometry ref so that
//     a WebGL context-lost mid-render doesn't throw and escape the boundary.
//   - BufferAttribute args prop is used instead of deprecated `array + count`
//     pattern, avoiding a Three.js deprecation warning in r152+.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef } from 'react'
import { useFrame }        from '@react-three/fiber'
import * as THREE          from 'three'

export default function ParticleGrid({ count = 60 }) {
  const meshRef = useRef()

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * count * 3)
    const colors    = new Float32Array(count * count * 3)
    const cA = new THREE.Color('#22d3ee')
    const cB = new THREE.Color('#d946ef')
    let i = 0
    for (let x = 0; x < count; x++) {
      for (let z = 0; z < count; z++) {
        positions[i * 3]     = (x - count / 2) * 1.2
        positions[i * 3 + 1] = -4
        positions[i * 3 + 2] = (z - count / 2) * 1.2
        const c = cA.clone().lerp(cB, z / count)
        colors[i * 3]     = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
        i++
      }
    }
    return { positions, colors }
  }, [count])

  useFrame(({ clock }) => {
    // Guard: if the geometry was disposed (context loss) skip silently
    const mesh = meshRef.current
    if (!mesh) return
    const pos = mesh.geometry?.attributes?.position
    if (!pos) return

    const t = clock.elapsedTime
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      pos.setY(i, -4 + Math.sin(x * 0.35 + t * 1.2) * Math.cos(z * 0.35 + t) * 0.8)
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.09}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  )
}