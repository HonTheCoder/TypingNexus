// ─────────────────────────────────────────────────────────────────────────────
// firebase/leaderboard.js  —  typed scores + UFO scores
// ─────────────────────────────────────────────────────────────────────────────

import { db, isFirebaseAvailable, mockDb } from './config'

const QUERY_TIMEOUT_MS = 5_000

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${QUERY_TIMEOUT_MS / 1000}s`)), QUERY_TIMEOUT_MS)
    ),
  ])
}

function annotate(err, label) {
  if (err?.code === 'permission-denied') {
    err.userMessage = `${label}: blocked by Firestore security rules.`
  } else if (err?.code === 'failed-precondition') {
    err.userMessage = `${label}: composite index required — check browser console for the Firestore link.`
  } else {
    err.userMessage = err.message ?? `${label} failed`
  }
  console.error(`[firestore] ${label} (${err?.code ?? 'unknown'}):`, err.message)
  return err
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPED MODE — collection: 'scores'
// Schema: { name, wpm, accuracy, mistakes, category, difficulty, timeLimit, createdAt }
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTopScores(selectedCategory, selectedDifficulty, selectedTimeLimit, top = 10) {
  if (!isFirebaseAvailable || !db) {
    return mockDb.getTopScores({ category: selectedCategory, difficulty: selectedDifficulty, timeLimit: selectedTimeLimit, top })
  }
  try {
    const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore')
    const q = query(
      collection(db, 'scores'),
      where('category',   '==', selectedCategory),
      where('difficulty', '==', selectedDifficulty),
      where('timeLimit',  '==', selectedTimeLimit),
      orderBy('wpm', 'desc'),
      limit(top)
    )
    const snap = await withTimeout(getDocs(q), 'Leaderboard fetch')
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) { throw annotate(err, 'Leaderboard fetch') }
}

export async function saveScore({ name, wpm, accuracy, category, difficulty, timeLimit, mistakes = 0 }) {
  const payload = {
    name:       String(name).slice(0, 16),
    wpm:        Math.round(wpm),
    accuracy:   Math.round(accuracy * 10) / 10,
    mistakes:   Math.max(0, Math.round(mistakes)),
    category, difficulty, timeLimit,
  }
  if (!isFirebaseAvailable || !db) {
    mockDb.addScore(payload)
    return { ok: true, source: 'local' }
  }
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
    await withTimeout(
      addDoc(collection(db, 'scores'), { ...payload, createdAt: serverTimestamp() }),
      'Score save'
    )
    return { ok: true, source: 'firestore' }
  } catch (err) { throw annotate(err, 'Score save') }
}

// ─────────────────────────────────────────────────────────────────────────────
// UFO MODE — collection: 'ufoScores'
// Schema: { name, score, wave, elapsed, createdAt }
// Ranked by score desc — no composite index needed (single orderBy)
// ─────────────────────────────────────────────────────────────────────────────

const UFO_MOCK_KEY = 'typing_nexus_mock_ufo_scores'

function readUfoMock() {
  try { return JSON.parse(localStorage.getItem(UFO_MOCK_KEY) || '[]') } catch { return [] }
}
function writeUfoMock(docs) {
  try { localStorage.setItem(UFO_MOCK_KEY, JSON.stringify(docs)) } catch {}
}

export async function fetchUfoScores(top = 10) {
  if (!isFirebaseAvailable || !db) {
    return readUfoMock()
      .sort((a, b) => b.score - a.score)
      .slice(0, top)
  }
  try {
    const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore')
    const q    = query(collection(db, 'ufoScores'), orderBy('score', 'desc'), limit(top))
    const snap = await withTimeout(getDocs(q), 'UFO leaderboard fetch')
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) { throw annotate(err, 'UFO leaderboard fetch') }
}

export async function saveUfoScore({ name, score, wave, elapsed }) {
  const payload = {
    name:    String(name).slice(0, 16),
    score:   Math.round(score),
    wave,                               // 'early' | 'mid' | 'late'
    elapsed: Math.round(elapsed),
  }
  if (!isFirebaseAvailable || !db) {
    const docs = readUfoMock()
    docs.push({ id: `local_${Date.now()}`, ...payload, createdAt: Date.now() })
    writeUfoMock(docs)
    return { ok: true, source: 'local' }
  }
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
    await withTimeout(
      addDoc(collection(db, 'ufoScores'), { ...payload, createdAt: serverTimestamp() }),
      'UFO score save'
    )
    return { ok: true, source: 'firestore' }
  } catch (err) { throw annotate(err, 'UFO score save') }
}