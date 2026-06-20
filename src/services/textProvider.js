import { generateWords } from '../data/words'

const DIFFICULTY_LENGTHS = {
  easy:   [3, 4, 5],
  medium: [6, 7, 8, 9],
  hard:   [10, 11, 12, 13],
  asian:  [13, 14, 15, 16, 17]
}

const FALLBACK_PARAGRAPHS = {
  easy: [
    'The sun set over the city as neon signs began to glow. A lone rider sped down the wet road, chasing the last light of the day. The air was cool and the night felt alive with color and sound.',
    'Rain fell on the glass towers while music played from an open window. People moved fast under bright lights, each one lost in their own small world of dreams and plans.'
  ],
  medium: [
    'Beneath the violet skyline, the courier weaved her motorcycle through holographic billboards and humming transit drones. Every delivery carried encrypted secrets, and tonight the package strapped to her back felt heavier than usual.',
    'The arcade on Seventh Street never truly closed. Synthwave melodies leaked through its chrome doors at all hours, drawing wanderers and dreamers toward rows of glowing cabinets that promised escape from the relentless city.'
  ],
  hard: [
    'The metropolis shimmered with incandescent extravagance, its labyrinthine boulevards saturated by phosphorescent advertisements promising transcendence through consumption. Yet beneath the kaleidoscopic veneer, clandestine syndicates orchestrated their surreptitious machinations.',
    'Her consciousness oscillated between the tangible world and the simulated expanse, an idiosyncratic existence characterized by perpetual ambiguity. The neurological interface hummed with quintessential precision, rendering imperceptible the boundary between authenticity and fabrication.'
  ],
  asian: [
    'Notwithstanding the incomprehensibilities of interdimensional thermodynamics, the magnetohydrodynamic propulsion array achieved unprecedented synchronization, its electroencephalographic governance system demonstrating uncharacteristically deterministic behavior throughout the ultracentrifugation sequence.',
    'The institutionalization of xenotransplantation protocols necessitated extraordinary compartmentalization, wherein spectrophotometrically calibrated instrumentation facilitated immunoelectrophoresis across radioimmunoassay thresholds previously deemed phenomenologically unattainable.'
  ]
}

async function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ])
}

/**
 * Datamuse API: CORS-enabled, no key, no rate-limit pain.
 * sp=???? (wildcards) returns real English words of an exact length.
 */
async function fetchWordsOfLength(length, max = 400) {
  const res = await withTimeout(
    fetch(`https://api.datamuse.com/words?sp=${'?'.repeat(length)}&max=${max}`)
  )
  if (!res.ok) throw new Error('bad status')
  const data = await res.json()
  return data
    .map(d => d.word.toLowerCase())
    .filter(w => /^[a-z]+$/.test(w)) // pure alphabetic only
}

/** Fetch a combined pool across multiple word lengths, in parallel. */
async function fetchWordsForLengths(lengths) {
  const results = await Promise.allSettled(lengths.map(l => fetchWordsOfLength(l)))
  const pool = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
  return pool.length >= 30 ? pool : null
}

/** WORDS mode: Datamuse pool by difficulty, local fallback. */
export async function fetchWordSet(difficulty, count = 200) {
  try {
    const pool = await fetchWordsForLengths(DIFFICULTY_LENGTHS[difficulty] ?? [4, 5, 6])
    if (pool) {
      return Array.from({ length: count }, () =>
        pool[Math.floor(Math.random() * pool.length)])
    }
  } catch { /* fall through to local */ }
  return generateWords(difficulty, count)
}

/** PARAGRAPH mode: dummyjson quotes (CORS-enabled), local fallback. */
export async function fetchParagraph(difficulty) {
  try {
    const res = await withTimeout(fetch('https://dummyjson.com/quotes/random/8'))
    if (!res.ok) throw new Error('bad status')
    const quotes = await res.json()
    const text = (Array.isArray(quotes) ? quotes : [quotes]).map(q => q.quote).join(' ')
    if (text.split(' ').length < 40) throw new Error('too short')
    return text.split(/\s+/)
  } catch {
    const pool = FALLBACK_PARAGRAPHS[difficulty] ?? FALLBACK_PARAGRAPHS.easy
    const text = Array.from({ length: 6 }, () =>
      pool[Math.floor(Math.random() * pool.length)]).join(' ')
    return text.split(/\s+/)
  }
}

export async function fetchText(category, difficulty) {
  return category === 'paragraph'
    ? fetchParagraph(difficulty)
    : fetchWordSet(difficulty)
}

/** UFO MODE: length-tiered banks from Datamuse, local fallback per tier. */
export async function fetchUfoWordBank() {
  const local = {
    short: generateWords('easy', 100).filter(w => w.length <= 4),
    mid: generateWords('medium', 100).filter(w => w.length >= 5 && w.length <= 7),
    long: generateWords('hard', 100)
  }
  try {
    const [short, mid, long] = await Promise.all([
      fetchWordsForLengths([3, 4]),
      fetchWordsForLengths([5, 6, 7]),
      fetchWordsForLengths([8, 9, 10])
    ])
    return {
      short: short ?? local.short,
      mid: mid ?? local.mid,
      long: long ?? local.long
    }
  } catch {
    return local
  }
}
