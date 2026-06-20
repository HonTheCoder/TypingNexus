// ─────────────────────────────────────────────────────────────────────────────
// hooks/useHaptics.js
// Vibration API wrapper. All calls are no-ops on browsers that don't support
// navigator.vibrate (iOS Safari, Firefox desktop, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const vibrate = (pattern) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  } catch {
    // silently ignore SecurityError on sandboxed iframes
  }
}

export const useHaptics = () => ({
  /** 10 ms snap — correct keystroke */
  correct: () => vibrate(10),
  /** double-pulse — wrong keystroke */
  mistake: () => vibrate([30, 50, 30]),
  /** very short click — button tap */
  tap:     () => vibrate(6),
})