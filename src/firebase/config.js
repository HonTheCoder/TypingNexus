// ─────────────────────────────────────────────────────────────────────────────
// firebase/config.js  –  Synchronous, defensive init — no top-level await
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps } from 'firebase/app'
import { getFirestore }           from 'firebase/firestore'

const PLACEHOLDER_PATTERNS = ['your-', 'YOUR_', 'undefined', 'null']

function isPlaceholder(value) {
  if (value === undefined || value === null) return true
  const s = String(value).trim()
  if (!s) return true
  return PLACEHOLDER_PATTERNS.some(p => s.startsWith(p))
}

// ── 1. Read env vars ──────────────────────────────────────────────────────────
const raw = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const missing = Object.entries(raw)
  .filter(([, v]) => isPlaceholder(v))
  .map(([k]) => k)

// ── 2. Availability flag ──────────────────────────────────────────────────────
export const isFirebaseAvailable = missing.length === 0

// ── 3. Synchronous Firebase init (no top-level await) ────────────────────────
let db = null

if (isFirebaseAvailable) {
  try {
    // Re-use existing app if hot-reload already initialised it
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(raw)
    db = getFirestore(app)
    console.info(`[firebase] connected → project: ${raw.projectId}`)
  } catch (err) {
    console.warn('[firebase] SDK init failed — falling back to localStorage mock.', err.message)
    db = null
  }
} else {
  console.warn(
    `[firebase] Missing / placeholder env vars: ${missing.join(', ')}.\n` +
    `→ Add VITE_FIREBASE_* to .env and RESTART the dev server.\n` +
    `→ Running in offline / localStorage-mock mode.`
  )
}

// ── 4. localStorage mock DB ───────────────────────────────────────────────────
const MOCK_COLLECTION = 'typing_nexus_mock_scores'

function readMockStore() {
  try { return JSON.parse(localStorage.getItem(MOCK_COLLECTION) || '[]') }
  catch { return [] }
}

function writeMockStore(docs) {
  try { localStorage.setItem(MOCK_COLLECTION, JSON.stringify(docs)) }
  catch { /* quota exceeded — silently skip */ }
}

export const mockDb = {
  addScore(data) {
    const docs = readMockStore()
    const doc  = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ...data,
      createdAt: Date.now(),
    }
    docs.push(doc)
    writeMockStore(docs)
    return doc
  },

  getTopScores({ category, difficulty, timeLimit, top = 10 }) {
    return readMockStore()
      .filter(d =>
        d.category   === category   &&
        d.difficulty === difficulty &&
        d.timeLimit  === timeLimit
      )
      .sort((a, b) => b.wpm - a.wpm)
      .slice(0, top)
  },
}

export { db }