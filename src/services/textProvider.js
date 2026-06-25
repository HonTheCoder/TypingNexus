// ─────────────────────────────────────────────────────────────────────────────
// services/textProvider.js
//
// Caching strategy — module-level Map with TTL:
//
//   CACHE_TTL     5 minutes — word pools don't change, this is generous
//   cache key     "<type>:<difficulty>"  e.g. "words:easy", "paragraph:hard"
//                 UFO uses a single key "ufo:all"
//
// On a hit:   return the cached pool immediately — 0 network calls
// On a miss:  fetch, store result + timestamp, return pool
// On expiry:  transparently re-fetch in the background (stale-while-revalidate)
//             so the player never waits on a TTL expiry
//
// This saves ~300ms per restart and prevents Datamuse API rate-limit hits
// in rapid-replay sessions (the API allows ~100k calls/day but rapid bursts
// from a single IP can trigger soft throttling).
// ─────────────────────────────────────────────────────────────────────────────

import { generateWords } from '../data/words'

const CACHE_TTL = 5 * 60 * 1000   // 5 minutes in ms

// Structure: Map<string, { data: any, at: number }>
const _cache = new Map()

function cacheGet(key) {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > CACHE_TTL) return null   // expired
  return entry.data
}

function cacheSet(key, data) {
  _cache.set(key, { data, at: Date.now() })
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DIFFICULTY_LENGTHS = {
  easy:   [3, 4, 5],
  medium: [6, 7, 8, 9],
  hard:   [10, 11, 12, 13],
  asian:  [13, 14, 15, 16, 17],
}

const FALLBACK_PARAGRAPHS = {
  easy: [
    'The sun set over the city as neon signs began to glow. A lone rider sped down the wet road, chasing the last light of the day. The air was cool and the night felt alive with color and sound.',
    'Rain fell on the glass towers while music played from an open window. People moved fast under bright lights, each one lost in their own small world of dreams and plans.',
  ],
  medium: [
    'Beneath the violet skyline, the courier weaved her motorcycle through holographic billboards and humming transit drones. Every delivery carried encrypted secrets, and tonight the package strapped to her back felt heavier than usual.',
    'The arcade on Seventh Street never truly closed. Synthwave melodies leaked through its chrome doors at all hours, drawing wanderers and dreamers toward rows of glowing cabinets that promised escape from the relentless city.',
  ],
  hard: [
    'The metropolis shimmered with incandescent extravagance, its labyrinthine boulevards saturated by phosphorescent advertisements promising transcendence through consumption. Yet beneath the kaleidoscopic veneer, clandestine syndicates orchestrated their surreptitious machinations.',
    'Her consciousness oscillated between the tangible world and the simulated expanse, an idiosyncratic existence characterized by perpetual ambiguity. The neurological interface hummed with quintessential precision, rendering imperceptible the boundary between authenticity and fabrication.',
  ],
  asian: [
    'Notwithstanding the incomprehensibilities of interdimensional thermodynamics, the magnetohydrodynamic propulsion array achieved unprecedented synchronization, its electroencephalographic governance system demonstrating uncharacteristically deterministic behavior throughout the ultracentrifugation sequence.',
    'The institutionalization of xenotransplantation protocols necessitated extraordinary compartmentalization, wherein spectrophotometrically calibrated instrumentation facilitated immunoelectrophoresis across radioimmunoassay thresholds previously deemed phenomenologically unattainable.',
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ])
}

async function fetchWordsOfLength(length, max = 400) {
  const res = await withTimeout(
    fetch(`https://api.datamuse.com/words?sp=${'?'.repeat(length)}&max=${max}`)
  )
  if (!res.ok) throw new Error('bad status')
  const data = await res.json()
  return data
    .map(d => d.word.toLowerCase())
    .filter(w => /^[a-z]+$/.test(w))
}

async function fetchWordsForLengths(lengths) {
  const results = await Promise.allSettled(lengths.map(l => fetchWordsOfLength(l)))
  const pool    = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  return pool.length >= 30 ? pool : null
}

// ── fetchWordSet ──────────────────────────────────────────────────────────────
// Cached by "words:<difficulty>"
// Returns a randomised array of `count` words drawn from the cached pool.
// The pool itself is cached — not the randomised array — so every restart
// gets a fresh shuffle while paying zero network cost after the first call.

export async function fetchWordSet(difficulty, count = 200) {
  const key      = `words:${difficulty}`
  const cached   = cacheGet(key)

  // Helper: build a randomised word list from a pool
  const shuffle = (pool) =>
    Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)])

  if (cached) return shuffle(cached)

  // Cache miss — fetch, store pool, return shuffled list
  try {
    const pool = await fetchWordsForLengths(DIFFICULTY_LENGTHS[difficulty] ?? [4, 5, 6])
    if (pool) {
      cacheSet(key, pool)
      return shuffle(pool)
    }
  } catch { /* fall through */ }

  // Fallback: local word generator (also cache it so repeated fallbacks are free)
  const fallback = generateWords(difficulty, 500)
  cacheSet(key, fallback)
  return shuffle(fallback)
}

// ── fetchParagraph ────────────────────────────────────────────────────────────
// Cached by "paragraph:<difficulty>"
// Paragraphs are cached as a string array (words split).
// Each restart gets the same paragraph until the TTL expires — intentional,
// since the player is re-trying the same content.

export async function fetchParagraph(difficulty) {
  const key    = `paragraph:${difficulty}`
  const cached = cacheGet(key)
  if (cached) return cached

  try {
    const res = await withTimeout(fetch('https://dummyjson.com/quotes/random/8'))
    if (!res.ok) throw new Error('bad status')
    const quotes = await res.json()
    const text   = (Array.isArray(quotes) ? quotes : [quotes]).map(q => q.quote).join(' ')
    if (text.split(' ').length < 40) throw new Error('too short')
    const words = text.split(/\s+/)
    cacheSet(key, words)
    return words
  } catch {
    const pool   = FALLBACK_PARAGRAPHS[difficulty] ?? FALLBACK_PARAGRAPHS.easy
    const text   = Array.from({ length: 6 }, () =>
      pool[Math.floor(Math.random() * pool.length)]).join(' ')
    const words  = text.split(/\s+/)
    cacheSet(key, words)
    return words
  }
}

// ── fetchText ─────────────────────────────────────────────────────────────────
export async function fetchText(category, difficulty) {
  return category === 'paragraph'
    ? fetchParagraph(difficulty)
    : fetchWordSet(difficulty)
}

// ── fetchUfoWordBank ──────────────────────────────────────────────────────────
// Cached under a single key "ufo:all" — the bank is reused across the whole
// UFO session and between retries. TTL keeps it fresh without re-fetching
// on every game restart.

export async function fetchUfoWordBank() {
  const key    = 'ufo:all'
  const cached = cacheGet(key)
  if (cached) return cached

  const local = {
    short: generateWords('easy',   100).filter(w => w.length <= 4),
    mid:   generateWords('medium', 100).filter(w => w.length >= 5 && w.length <= 7),
    long:  generateWords('hard',   100),
  }

  try {
    const [short, mid, long] = await Promise.all([
      fetchWordsForLengths([3, 4]),
      fetchWordsForLengths([5, 6, 7]),
      fetchWordsForLengths([8, 9, 10]),
    ])
    const bank = {
      short: short ?? local.short,
      mid:   mid   ?? local.mid,
      long:  long  ?? local.long,
    }
    cacheSet(key, bank)
    return bank
  } catch {
    cacheSet(key, local)
    return local
  }
}

// ── clearCache ────────────────────────────────────────────────────────────────
// Exported so Settings could offer a "Refresh word pools" button if needed.
export function clearCache(key) {
  if (key) _cache.delete(key)
  else     _cache.clear()
}