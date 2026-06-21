// ─────────────────────────────────────────────────────────────────────────────
// components/menu/MainMenu.jsx  —  mobile-responsive
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import ParticleGrid from '../three/ParticleGrid'
import { useGameStore } from '../../store/useGameStore'
import { useSfx, useBGM } from '../../hooks/useAudio'
import { useHaptics } from '../../hooks/useHaptics'

function HoverShape({ position, color, geometry }) {
  const ref    = useRef()
  const [hovered, setHovered] = useState(false)
  const pulse  = useRef(0)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    ref.current.rotation.x = t * 0.4
    ref.current.rotation.y = t * 0.6
    ref.current.position.y = position[1] + Math.sin(t + position[0]) * 0.3
    pulse.current = Math.max(0, pulse.current - dt * 2)
    const s = hovered ? 1.5 : 1 + pulse.current * 0.4
    ref.current.scale.lerp({ x: s, y: s, z: s }, 0.12)
    ref.current.material.emissiveIntensity = hovered ? 2.5 : 0.6 + pulse.current * 1.5
  })

  return (
    <mesh ref={ref} position={position}
      onPointerOver={() => { setHovered(true); pulse.current = 1 }}
      onPointerOut={() => setHovered(false)}>
      {geometry === 'ico'
        ? <icosahedronGeometry args={[0.7, 0]} />
        : <octahedronGeometry   args={[0.7, 0]} />}
      <meshStandardMaterial color="#0a0520" emissive={color}
        emissiveIntensity={0.6} metalness={0.8} roughness={0.2} wireframe />
    </mesh>
  )
}

function HoverStructures() {
  return (
    <>
      <HoverShape position={[-7,  2,   2]}   color="#22d3ee" geometry="ico" />
      <HoverShape position={[ 7,  3,   1]}   color="#d946ef" geometry="oct" />
      <HoverShape position={[-6, -1,   3]}   color="#a855f7" geometry="oct" />
      <HoverShape position={[ 6.5,-1.5,2.5]} color="#facc15" geometry="ico" />
    </>
  )
}

const ACCENTS = {
  cyan:    { text: 'text-cyan-400',    border: 'border-cyan-500/30',    hover: 'hover:bg-cyan-500/20    hover:text-cyan-300    hover:border-cyan-400    hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'    },
  fuchsia: { text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', hover: 'hover:bg-fuchsia-500/20 hover:text-fuchsia-300 hover:border-fuchsia-400 hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]' },
  purple:  { text: 'text-purple-400',  border: 'border-purple-500/30',  hover: 'hover:bg-purple-500/20  hover:text-purple-300  hover:border-purple-400  hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'  },
  yellow:  { text: 'text-yellow-400',  border: 'border-yellow-500/30',  hover: 'hover:bg-yellow-500/20  hover:text-yellow-300  hover:border-yellow-400  hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]'  },
  emerald: { text: 'text-emerald-400', border: 'border-emerald-500/30', hover: 'hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]'  },
}

function MenuButton({ title, subtitle, accent, onClick }) {
  const a = ACCENTS[accent]
  const haptics = useHaptics()
  return (
    <button onClick={() => { haptics.tap(); onClick() }}
      className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg text-center select-none
        bg-slate-900/60 backdrop-blur-md border ${a.border} ${a.text} ${a.hover}
        transition-all duration-300 active:scale-95`}>
      <h3 className="font-display font-bold uppercase tracking-[0.25em] text-sm sm:text-base">{title}</h3>
      <span className="block text-[10px] sm:text-xs opacity-60 tracking-[0.2em] mt-0.5">{subtitle}</span>
    </button>
  )
}

export default function MainMenu() {
  const { startSetup, setScene } = useGameStore()
  const sfx = useSfx()
  useBGM('menu')   // plays mainmenu.mp3, stops when scene changes
  const go  = (fn) => () => { sfx.click(); fn() }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">

      {/* 3D background */}
      <div className="absolute inset-0">
        <Canvas style={{ width: '100%', height: '100%', display: 'block' }}
          camera={{ position: [0, 2, 12], fov: 60 }}>
          <color attach="background" args={['#010110']} />
          <fog   attach="fog"        args={['#010110', 12, 40]} />
          <ambientLight intensity={0.3} />
          <pointLight position={[0,  5, 8]} intensity={50} color="#d946ef" />
          <pointLight position={[-8, 3, 4]} intensity={35} color="#22d3ee" />
          <Stars radius={90} depth={50} count={4000} factor={4} fade speed={1.2} />
          <ParticleGrid count={55} />
          <HoverStructures />
        </Canvas>
      </div>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[480px] sm:w-[640px] h-[480px] sm:h-[640px] rounded-full bg-purple-600/15 blur-[140px]" />
        <div className="absolute w-[300px] sm:w-[420px] h-[260px] sm:h-[360px] rounded-full bg-cyan-500/10 blur-[120px] translate-x-16 sm:translate-x-24 -translate-y-10 sm:-translate-y-16" />
      </div>

      {/* Menu UI — scrollable on very small screens */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 sm:gap-6 px-4 overflow-y-auto py-6">
        <div className="text-center">
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-[0.15em] sm:tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-purple-400 drop-shadow-[0_0_25px_rgba(217,70,239,0.45)]">
            TYPING NEXUS
          </h1>
          <p className="text-cyan-400/50 text-[9px] sm:text-[11px] tracking-[0.4em] sm:tracking-[0.5em] mt-2">
            SYNTHWAVE TYPING TRIALS
          </p>
        </div>

        <nav className="flex flex-col items-stretch gap-3 w-full max-w-sm pointer-events-auto">
          <MenuButton title="Start"        subtitle="Ranked // World Records"    accent="cyan"    onClick={go(() => startSetup('ranked'))} />
          <MenuButton title="UFO Inbound"  subtitle="Special Mode // Defend Earth" accent="fuchsia" onClick={go(() => setScene('ufo'))} />
          <MenuButton title="Practice"     subtitle="No Pressure // Pure Reps"   accent="purple"  onClick={go(() => startSetup('practice'))} />
          <MenuButton title="Leaderboards" subtitle="Global Standings"           accent="yellow"  onClick={go(() => setScene('leaderboard'))} />
          <MenuButton title="Settings"     subtitle="Theme // Audio // Credits"  accent="emerald" onClick={go(() => setScene('settings'))} />
        </nav>

        <p className="text-slate-600 text-[9px] tracking-[0.35em]">v1.0 // © 2026 HONEYBOYS GROUP</p>
      </div>
    </div>
  )
}