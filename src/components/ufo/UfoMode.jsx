// ─────────────────────────────────────────────────────────────────────────────
// components/ufo/UfoMode.jsx  —  mobile-responsive layout
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Heart, Trophy, X, Zap } from 'lucide-react'
import { fetchUfoWordBank } from '../../services/textProvider'
import { useSfx } from '../../hooks/useAudio'
import { useHaptics } from '../../hooks/useHaptics'
import { useGameStore } from '../../store/useGameStore'
import ConfirmModal from '../game/ConfirmModal'

let UID = 0
const SPAWN_Z = -60
const KILL_Z  = 4

function getPhase(elapsed) {
  if (elapsed < 20) return 'early'
  if (elapsed < 60) return 'mid'
  return 'late'
}
const PHASE_TIER   = { early: 'short', mid: 'mid', late: 'long' }
const PHASE_LABELS = { early: 'WAVE 1 // RECON', mid: 'WAVE 2 // ASSAULT', late: 'WAVE 3 // ONSLAUGHT' }

function pickWord(bank, phase, activeWords) {
  const pool = bank[PHASE_TIER[phase]]
  for (let i = 0; i < 30; i++) {
    const w = pool[Math.floor(Math.random() * pool.length)]
    if (!activeWords.includes(w) && !activeWords.some(a => a[0] === w[0])) return w
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

function makeUfo(phase, bank, activeWords) {
  const speeds = { early: [3, 5], mid: [5, 8], late: [8, 12] }
  const [lo, hi] = speeds[phase]
  return {
    id: ++UID, phase,
    word: pickWord(bank, phase, activeWords),
    pos: new THREE.Vector3((Math.random() - 0.5) * 16, Math.random() * 5 - 1, SPAWN_Z),
    speed: lo + Math.random() * (hi - lo),
    spinDir: UID % 2 === 0 ? 1 : -1,
  }
}

// ── Three.js components (unchanged internals) ─────────────────────────────────
function UfoMesh({ ufo, typed, isTarget }) {
  const group     = useRef()
  const textGroup = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    group.current.position.copy(ufo.pos)
    if (ufo.phase !== 'early') group.current.rotation.y = t * (ufo.phase === 'late' ? 3 : 1.2)
    if (ufo.phase === 'early') {
      textGroup.current.rotation.set(0, 0, 0)
    } else if (ufo.phase === 'mid') {
      textGroup.current.rotation.y = Math.sin(t * 2 + ufo.id) * 0.5
      textGroup.current.rotation.z = Math.sin(t * 1.3 + ufo.id) * 0.15
    } else {
      textGroup.current.rotation.y = Math.sin(t * 5 + ufo.id) * 1.1 * ufo.spinDir
      textGroup.current.rotation.z = Math.cos(t * 4 + ufo.id) * 0.3 * ufo.spinDir
    }
  })

  return (
    <group ref={group}>
      <mesh>
        <cylinderGeometry args={[1.1, 1.4, 0.3, 24]} />
        <meshStandardMaterial color="#1a0a35" metalness={0.9} roughness={0.2}
          emissive={isTarget ? '#d946ef' : '#22d3ee'}
          emissiveIntensity={isTarget ? 1.2 : 0.3} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#22d3ee" transparent opacity={0.5}
          emissive="#22d3ee" emissiveIntensity={0.8} />
      </mesh>
      <group ref={textGroup} position={[0, 1.4, 0]}>
        <Text fontSize={0.55} anchorX="center"
          color={isTarget ? '#facc15' : '#ffffff'}
          outlineWidth={0.02} outlineColor="#010110">
          {ufo.word}
        </Text>
        {isTarget && typed.length > 0 && (
          <Text fontSize={0.55} anchorX="center" position={[0, 0, 0.01]} color="#34d399">
            {ufo.word.slice(0, typed.length) + ' '.repeat(Math.max(0, ufo.word.length - typed.length))}
          </Text>
        )}
      </group>
    </group>
  )
}

function Explosion({ position, onDone }) {
  const ref        = useRef()
  const velocities = useRef(
    Array.from({ length: 60 }, () => new THREE.Vector3(
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 14,
    ))
  )
  const life = useRef(1)

  useFrame((_, dt) => {
    life.current -= dt * 1.4
    if (life.current <= 0) { onDone(); return }
    const pos = ref.current.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i,
        pos.getX(i) + velocities.current[i].x * dt,
        pos.getY(i) + velocities.current[i].y * dt,
        pos.getZ(i) + velocities.current[i].z * dt,
      )
    }
    pos.needsUpdate = true
    ref.current.material.opacity = life.current
  })

  return (
    <points ref={ref} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={60}
          array={new Float32Array(180)} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.25} color="#facc15" transparent />
    </points>
  )
}

function UfoField({ ufos, setUfos, typed, onBreach, paused, phase, bank }) {
  const spawnTimer = useRef(0)
  useFrame((_, dt) => {
    if (paused || !bank) return
    spawnTimer.current += dt
    const spawnRate = phase === 'late' ? 1.4 : phase === 'mid' ? 1.8 : 2.2
    const maxUfos   = phase === 'late' ? 8 : 6
    if (spawnTimer.current > spawnRate && ufos.length < maxUfos) {
      spawnTimer.current = 0
      setUfos(u => [...u, makeUfo(phase, bank, u.map(x => x.word))])
    }
    let breached = false
    ufos.forEach(u => {
      u.pos.z += u.speed * dt
      if (u.pos.z >= KILL_Z) breached = true
    })
    if (breached) {
      setUfos(u => u.filter(x => x.pos.z < KILL_Z))
      onBreach()
    }
  })
  const targetId = ufos.find(u => typed.length > 0 && u.word.startsWith(typed))?.id
  return ufos.map(u => <UfoMesh key={u.id} ufo={u} typed={typed} isTarget={u.id === targetId} />)
}

// ── Virtual keyboard for UFO mode (letters only, mobile) ─────────────────────
const UFO_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
]
const FLASH_MS = 120

function UfoKey({ k, onTap }) {
  const [flash, setFlash] = useState(false)
  const fire = (e) => {
    e.preventDefault()
    setFlash(true)
    setTimeout(() => setFlash(false), FLASH_MS)
    onTap(k)
  }
  return (
    <button
      onTouchStart={fire} onClick={fire} tabIndex={-1}
      className={`relative flex-1 h-9 rounded-md border font-display text-[11px] font-bold uppercase transition-all duration-75 active:scale-95 select-none
        ${flash
          ? 'bg-purple-400/20 border-purple-400 text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.8)]'
          : 'bg-slate-900/70 border-purple-500/25 text-purple-300/80 backdrop-blur-sm'
        }`}
    >
      {k}
      {flash && <span className="absolute inset-0 rounded-md animate-ping bg-purple-400/20 pointer-events-none" />}
    </button>
  )
}

function UfoVirtualKeyboard({ onTap }) {
  const haptics = useHaptics()
  const handle  = (k) => { haptics.tap(); onTap(k) }
  return (
    <div className="md:hidden w-full px-1 pb-2 pt-1 bg-slate-950/90 backdrop-blur-md border-t border-purple-500/20 shrink-0">
      <div className="flex gap-[3px] mb-[3px]">
        {UFO_ROWS[0].map(k => <UfoKey key={k} k={k} onTap={handle} />)}
      </div>
      <div className="flex gap-[3px] mb-[3px] px-[4%]">
        {UFO_ROWS[1].map(k => <UfoKey key={k} k={k} onTap={handle} />)}
      </div>
      <div className="flex gap-[3px]">
        {/* Backspace */}
        <button
          onTouchStart={(e) => { e.preventDefault(); haptics.tap(); onTap('Backspace') }}
          onClick={() => { haptics.tap(); onTap('Backspace') }}
          tabIndex={-1}
          className="w-[14%] h-9 rounded-md border bg-rose-900/40 border-rose-500/30 text-rose-400 font-display text-[10px] select-none active:scale-95"
        >⌫</button>
        <div className="flex gap-[3px] flex-1">
          {UFO_ROWS[2].map(k => <UfoKey key={k} k={k} onTap={handle} />)}
        </div>
        <div className="w-[14%]" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UfoMode() {
  const setScene = useGameStore(s => s.setScene)
  const sfx      = useSfx()
  const haptics  = useHaptics()

  const [bank,        setBank]        = useState(null)
  const [ufos,        setUfos]        = useState([])
  const [typed,       setTyped]       = useState('')
  const [health,      setHealth]      = useState(5)
  const [score,       setScore]       = useState(0)
  const [elapsed,     setElapsed]     = useState(0)
  const [explosions,  setExplosions]  = useState([])
  const [confirmExit, setConfirmExit] = useState(false)

  const gameOver = health <= 0
  const paused   = gameOver || confirmExit || !bank
  const phase    = getPhase(elapsed)

  useEffect(() => {
    let alive = true
    fetchUfoWordBank().then(b => { if (alive) setBank(b) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [paused])

  const onBreach = useCallback(() => {
    sfx.error(); haptics.mistake()
    setHealth(h => Math.max(0, h - 1))
  }, [sfx, haptics])

  // Shared input handler — used by both physical keyboard and virtual keyboard
  const handleInput = useCallback((key) => {
    if (paused) return
    if (key === 'Backspace') { setTyped(t => t.slice(0, -1)); return }
    if (key.length !== 1) return
    const next = typed + key
    const hit  = ufos.find(u => u.word === next)
    if (hit) {
      sfx.kaboom(); haptics.correct()
      setExplosions(ex => [...ex, { id: hit.id, position: hit.pos.toArray() }])
      setUfos(u => u.filter(x => x.id !== hit.id))
      setScore(s => s + hit.word.length * 10)
      setTyped('')
    } else if (ufos.some(u => u.word.startsWith(next))) {
      sfx.type(); haptics.correct()
      setTyped(next)
    } else {
      sfx.error(); haptics.mistake()
      setTyped('')
    }
  }, [typed, ufos, paused, sfx, haptics])

  // Physical keyboard
  useEffect(() => {
    const onKey = (e) => { if (e.key.length === 1 || e.key === 'Backspace') handleInput(e.key) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleInput])

  const restart = () => {
    setUfos([]); setTyped(''); setHealth(5)
    setScore(0); setElapsed(0); setExplosions([])
  }

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col overflow-hidden">

      {/* ── 3D Canvas ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <Canvas style={{ width: '100%', height: '100%', display: 'block' }}
          camera={{ position: [0, 1, 8], fov: 60 }}>
          <color attach="background" args={['#010110']} />
          <fog   attach="fog"        args={['#010110', 20, 70]} />
          <ambientLight intensity={0.3} />
          <pointLight position={[0, 8, 4]} intensity={80} color="#a855f7" />
          <directionalLight position={[5, 5, 5]} intensity={1} color="#22d3ee" />
          <Stars radius={100} depth={60} count={5000} factor={5} fade speed={2} />
          <UfoField ufos={ufos} setUfos={setUfos} typed={typed}
            onBreach={onBreach} paused={paused} phase={phase} bank={bank} />
          {explosions.map(ex => (
            <Explosion key={ex.id} position={ex.position}
              onDone={() => setExplosions(e => e.filter(x => x.id !== ex.id))} />
          ))}
        </Canvas>
      </div>

      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-start gap-2 px-3 pt-3 pb-2 shrink-0">

        {/* HUD tiles — horizontal scrolling row */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1 pb-0.5">

          {/* Hull / Health */}
          <div className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-md border border-red-500/25 rounded-lg px-3 py-2 shrink-0">
            <Heart size={14} className="text-red-400 shrink-0" strokeWidth={2} />
            <div>
              <span className="block text-[8px] tracking-[0.2em] text-slate-500 uppercase">Hull</span>
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={`w-2.5 h-2.5 rounded-sm transition-all duration-300
                    ${i < health
                      ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.7)]'
                      : 'bg-slate-700'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-md border border-yellow-500/25 rounded-lg px-3 py-2 shrink-0">
            <Trophy size={14} className="text-yellow-300 shrink-0" strokeWidth={2} />
            <div>
              <span className="block text-[8px] tracking-[0.2em] text-slate-500 uppercase">Score</span>
              <span className="block font-display text-lg font-bold leading-tight text-yellow-300 neon-text">{score}</span>
            </div>
          </div>

          {/* Wave / Phase */}
          <div className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-md border border-fuchsia-500/25 rounded-lg px-3 py-2 shrink-0">
            <Zap size={14} className="text-fuchsia-400 shrink-0" strokeWidth={2} />
            <div>
              <span className="block text-[8px] tracking-[0.2em] text-slate-500 uppercase">Wave</span>
              <span className="block font-display text-[10px] font-bold leading-tight text-fuchsia-400 tracking-wider">
                {PHASE_LABELS[phase].split('//')[0].trim()}
              </span>
            </div>
          </div>
        </div>

        {/* Exit button */}
        <button
          onClick={() => { sfx.click(); haptics.tap(); setConfirmExit(true) }}
          className="flex items-center gap-1.5 bg-slate-900/70 backdrop-blur-md border border-fuchsia-500/20 rounded-lg px-3 py-2 text-[11px] text-slate-300 hover:text-fuchsia-400 hover:border-fuchsia-400 tracking-widest transition-all duration-300 shrink-0"
        >
          <X size={11} /> EXIT
        </button>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {!bank && (
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <p className="text-cyan-400/70 tracking-[0.35em] animate-pulse font-display text-xs">
            DOWNLOADING TARGET DICTIONARY...
          </p>
        </div>
      )}

      {/* ── Spacer pushes typed box to bottom ─────────────────────────────── */}
      {bank && <div className="flex-1" />}

      {/* ── Typed word display ────────────────────────────────────────────── */}
      {bank && !gameOver && (
        <div className="relative z-10 px-3 pb-3 shrink-0">
          <div className="w-full bg-slate-900/70 backdrop-blur-md border border-cyan-500/30 rounded-lg px-4 py-3 text-center">
            <span className="font-display text-2xl sm:text-3xl tracking-[0.2em] text-cyan-300 neon-text">
              {typed || <span className="opacity-40">▌</span>}
            </span>
          </div>
        </div>
      )}

      {/* ── Virtual keyboard — mobile only ────────────────────────────────── */}
      {bank && !gameOver && (
        <UfoVirtualKeyboard onTap={handleInput} />
      )}

      {/* ── Confirm exit modal ────────────────────────────────────────────── */}
      {confirmExit && !gameOver && (
        <ConfirmModal
          title="Abandon Defense?"
          subtitle="Invasion frozen // progress will be lost"
          confirmLabel="YES, EXIT" cancelLabel="NO, RESUME"
          onConfirm={() => { sfx.click(); setScene('menu') }}
          onCancel={() => { sfx.click(); setConfirmExit(false) }}
        />
      )}

      {/* ── Game Over ─────────────────────────────────────────────────────── */}
      {gameOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#010110]/85 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm sm:max-w-lg bg-slate-900/70 backdrop-blur-md border border-fuchsia-500/30 rounded-xl px-6 sm:px-12 py-10 sm:py-12 text-center shadow-[0_0_40px_rgba(217,70,239,0.3)] animate-fade-up">
            <h2 className="font-display font-bold text-2xl sm:text-4xl uppercase tracking-[0.15em] text-fuchsia-400 neon-text mb-4">
              Earth Has Fallen
            </h2>
            <p className="text-slate-300 text-base sm:text-lg mb-2">
              FINAL SCORE: <span className="text-yellow-300 font-display font-bold">{score}</span>
            </p>
            <p className="text-slate-500 text-xs tracking-[0.2em] mb-8 uppercase">
              Survived {elapsed}s // {PHASE_LABELS[phase]}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { sfx.click(); haptics.tap(); restart() }}
                className="flex-1 sm:flex-none px-6 py-3 rounded-lg border border-cyan-500/50 text-cyan-400 font-display text-xs tracking-widest hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300 active:scale-95"
              >
                RETRY
              </button>
              <button
                onClick={() => { sfx.click(); haptics.tap(); setScene('menu') }}
                className="flex-1 sm:flex-none px-6 py-3 rounded-lg border border-slate-600 text-slate-400 font-display text-xs tracking-widest hover:bg-white/10 hover:text-slate-200 transition-all duration-300 active:scale-95"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}