// ─────────────────────────────────────────────────────────────────────────────
// firebase/leaderboard.js  —  includes `mistakes` in schema
// ─────────────────────────────────────────────────────────────────────────────

import { db, isFirebaseAvailable, mockDb } from './config'

const QUERY_TIMEOUT_MS = 5_000

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${QUERY_TIMEOUT_MS / 1000}s`)),
        QUERY_TIMEOUT_MS
      )
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

// ── fetchTopScores ────────────────────────────────────────────────────────────
export async function fetchTopScores(
  selectedCategory,
  selectedDifficulty,
  selectedTimeLimit,
  top = 10
) {
  if (!isFirebaseAvailable || !db) {
    return mockDb.getTopScores({
      category:   selectedCategory,
      difficulty: selectedDifficulty,
      timeLimit:  selectedTimeLimit,
      top,
    })
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
  } catch (err) {
    throw annotate(err, 'Leaderboard fetch')
  }
}

// ── saveScore — now includes `mistakes` field ─────────────────────────────────
export async function saveScore({
  name, wpm, accuracy, category, difficulty, timeLimit,
  mistakes = 0,   // ← NEW field
}) {
  const payload = {
    name:       String(name).slice(0, 16),
    wpm:        Math.round(wpm),
    accuracy:   Math.round(accuracy * 10) / 10,
    mistakes:   Math.max(0, Math.round(mistakes)),   // ← stored in Firestore
    category,
    difficulty,
    timeLimit,
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
  } catch (err) {
    throw annotate(err, 'Score save')
  }
}