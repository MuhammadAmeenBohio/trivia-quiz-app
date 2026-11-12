// Pure streak logic: no sound, no animation, no React.
// Hitting a streak fires an event and RESETS that counter to 0,
// so the celebration doesn't repeat on every answer after the third.

export const STREAK_LENGTH = 3

export type StreakState = { correct: number; wrong: number }
export type StreakEvent = 'hat-trick' | 'oof' | null

export const initialStreak: StreakState = { correct: 0, wrong: 0 }

export function nextStreak(
  state: StreakState,
  isCorrect: boolean
): { state: StreakState; event: StreakEvent } {
  if (isCorrect) {
    const correct = state.correct + 1
    if (correct >= STREAK_LENGTH) return { state: { correct: 0, wrong: 0 }, event: 'hat-trick' }
    return { state: { correct, wrong: 0 }, event: null }
  }
  const wrong = state.wrong + 1
  if (wrong >= STREAK_LENGTH) return { state: { correct: 0, wrong: 0 }, event: 'oof' }
  return { state: { correct: 0, wrong }, event: null }
}
