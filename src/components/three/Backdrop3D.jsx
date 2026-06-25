// ─────────────────────────────────────────────────────────────────────────────
// components/three/Backdrop3D.jsx
//
// THREE.WebGLRenderer: Context Lost  fix:
//   - Context loss is a *DOM event*, not a React render error, so an error
//     boundary alone cannot catch it. The fix attaches a webglcontextlost
//     listener directly on the <canvas> DOM node inside onCreated, and when
//     it fires it calls a remount callback that bumps a key on the wrapper,
//     tearing down and rebuilding the entire Canvas/Three.js tree cleanly.
//   - The React error boundary is still present as a second layer to catch
//     any synchronous Three.js / R3F render errors.
//   - frameloop="always" is used (vs "demand") so the internal R3F render loop
//     stays active; "demand" caused the context to go stale on some drivers.
//   - All of this is completely isolated from game state, DB state, and audio.
// ─────────────────────────────────────────────────────────────────────────────

import { Component, useState, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars }  from '@react-three/drei'
import ParticleGrid from './ParticleGrid'

// ── React error boundary (catches synchronous R3F/Three.js render throws) ─────
class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { crashed: false }
  }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(err) {
    const msg = String(err?.message ?? '')
    // Only log non-context-loss errors so the console stays clean
    if (!msg.toLowerCase().includes('webgl') && !msg.toLowerCase().includes('context')) {
      console.error('[Backdrop3D] unexpected render error:', err)
    }
  }

  render() {
    if (this.state.crashed) {
      return (
        <div
          className="absolute inset-0"
          style={{ background: '#010110' }}
          aria-hidden="true"
        />
      )
    }
    return this.props.children
  }
}

// ── Inner Canvas — isolated from all DB / network / audio state ───────────────
function ThreeCanvas({ onContextLost }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      camera={{ position: [0, 1.5, 10], fov: 55 }}
      frameloop="always"
      gl={{
        powerPreference:              'high-performance', // dedicated GPU path, less likely to lose context
        failIfMajorPerformanceCaveat: false,
        antialias:                    false,   // reduces VRAM pressure on mobile
        alpha:                        false,   // opaque canvas — saves memory
        depth:                        true,
        stencil:                      false,   // not needed — saves GPU memory
      }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement

        // ── THE KEY FIX: listen for context loss on the actual DOM canvas ────
        // e.preventDefault() tells the browser Three.js will handle recovery.
        // If recovery isn't possible within 2 s we force a full remount.
        let recoveryTimer = null

        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          console.warn('[Backdrop3D] WebGL context lost — attempting recovery…')

          // Give the browser/driver 2 s to restore the context naturally.
          // If it hasn't restored by then, force a full React remount.
          recoveryTimer = setTimeout(() => {
            console.warn('[Backdrop3D] context not restored after 1 s — forcing remount')
            onContextLost()
          }, 1000)
        }, false)

        canvas.addEventListener('webglcontextrestored', () => {
          console.info('[Backdrop3D] WebGL context restored ✓')
          clearTimeout(recoveryTimer)
        }, false)
      }}
    >
      <color attach="background" args={['#010110']} />
      <fog   attach="fog"        args={['#010110', 14, 38]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0,  6, 6]} intensity={60} color="#d946ef" />
      <pointLight position={[-6, 2, 4]} intensity={40} color="#22d3ee" />
      <Stars radius={80} depth={40} count={3000} factor={4} fade speed={1} />
      <ParticleGrid count={40} />
    </Canvas>
  )
}

// ── Public component ──────────────────────────────────────────────────────────
export default function Backdrop3D() {
  // Incrementing this key tears down and rebuilds the entire Canvas tree,
  // giving Three.js a fresh WebGL context — without touching any parent state.
  const [mountKey, setMountKey] = useState(0)

  const handleContextLost = useCallback(() => {
    setMountKey(k => k + 1)
  }, [])

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/* key on the boundary forces a full unmount/remount of Canvas on context loss */}
      <WebGLErrorBoundary key={mountKey}>
        <ThreeCanvas onContextLost={handleContextLost} />
      </WebGLErrorBoundary>
    </div>
  )
}