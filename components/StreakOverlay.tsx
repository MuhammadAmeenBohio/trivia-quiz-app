'use client'
import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { StreakEvent } from '@/lib/streaks'

export type StreakFire = { kind: Exclude<StreakEvent, null>; id: number }

// tiny seeded PRNG so the throw pattern is pure per fire id
function rng(seed: number) {
  let a = seed * 2654435761
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const THROWN = ['🍅', '🍅', '🍅', '🗑️', '🥚', '🍌', '🧦']

function fireConfetti() {
  const colors = ['#6C5CE7', '#A99BF5', '#EDE9FE', '#111114', '#ffffff']
  const burst = (origin: { x: number; y: number }, angle: number) =>
    confetti({ particleCount: 90, spread: 70, angle, origin, colors, ticks: 220, scalar: 1.1 })
  burst({ x: 0, y: 0.7 }, 60)
  burst({ x: 1, y: 0.7 }, 120)
  setTimeout(() => confetti({ particleCount: 160, spread: 120, origin: { x: 0.5, y: 0.4 }, colors }), 250)
  setTimeout(() => burst({ x: 0.5, y: 0.9 }, 90), 700)
}

/**
 * Visual-only streak celebration/boo. Sound is triggered by the caller;
 * this component only needs to know WHAT happened (`fire`), not why.
 */
export default function StreakOverlay({
  fire,
  onDone,
}: {
  fire: StreakFire | null
  onDone: () => void
}) {
  useEffect(() => {
    if (!fire) return
    if (fire.kind === 'hat-trick') fireConfetti()
    const t = setTimeout(onDone, fire.kind === 'hat-trick' ? 3200 : 3000)
    return () => clearTimeout(t)
  }, [fire, onDone])

  // random flight paths, regenerated per fire
  const projectiles = useMemo(() => {
    if (!fire || fire.kind !== 'oof') return []
    const r = rng(fire.id)
    return Array.from({ length: 16 }, (_, i) => {
      const fromLeft = i % 2 === 0
      return {
        key: i,
        emoji: THROWN[Math.floor(r() * THROWN.length)],
        fromLeft,
        y: 10 + r() * 70,
        endX: 30 + r() * 40,
        endY: 30 + r() * 55,
        rot: (r() - 0.5) * 900,
        delay: i * 0.1,
        size: 2 + r() * 2,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire?.id])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {fire?.kind === 'hat-trick' && (
          <motion.div
            key={`ht-${fire.id}`}
            className="absolute inset-0 grid place-items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.3, 1], rotate: [-20, 6, -4] }}
              transition={{ duration: 0.6, ease: 'backOut' }}
              className="text-center"
            >
              <div className="rounded-full bg-primary px-8 py-4 font-heading text-5xl font-bold text-white shadow-2xl sm:px-12 sm:text-7xl">
                HAT TRICK!
              </div>
              <div className="mt-3 font-heading text-2xl font-bold text-foreground">On fire 🔥</div>
            </motion.div>
          </motion.div>
        )}

        {fire?.kind === 'oof' && (
          <motion.div
            key={`oof-${fire.id}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/10" />
            {projectiles.map((p) => (
              <motion.div
                key={p.key}
                className="absolute"
                style={{ top: `${p.y}%`, left: p.fromLeft ? '-10%' : '110%', fontSize: `${p.size}rem` }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: `${(p.fromLeft ? 1 : -1) * (window.innerWidth * (p.endX / 100) + 80)}px`,
                  y: `${(p.endY - p.y) * 0.01 * window.innerHeight}px`,
                  rotate: p.rot,
                  opacity: [1, 1, 1, 0],
                  scale: [1, 1, 1.5, 1.8], // splat!
                }}
                transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
              >
                {p.emoji}
              </motion.div>
            ))}
            <div className="absolute inset-0 grid place-items-center">
              <motion.div
                initial={{ scale: 0, rotate: 15 }}
                animate={{ scale: [0, 1.3, 1], rotate: [15, -6, 3] }}
                transition={{ duration: 0.5, ease: 'backOut' }}
                className="rounded-full bg-foreground px-10 py-4 font-heading text-6xl font-bold text-white shadow-2xl sm:px-14 sm:text-8xl"
              >
                OOF!
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
