'use client'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

/** Counts up from `from` to `value`. Calls onTick for each whole-number change (for sound). */
export default function AnimatedNumber({
  value,
  from = 0,
  duration = 1.6,
  onTick,
  onDone,
  className,
}: {
  value: number
  from?: number
  duration?: number
  onTick?: () => void
  onDone?: () => void
  className?: string
}) {
  const [display, setDisplay] = useState(from)
  const cb = useRef({ onTick, onDone })
  useEffect(() => {
    cb.current = { onTick, onDone }
  })

  useEffect(() => {
    let last = from
    const controls = animate(from, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        const n = Math.round(v)
        if (n !== last) {
          last = n
          setDisplay(n)
          if (n % 10 === 0) cb.current.onTick?.()
        }
      },
      onComplete: () => cb.current.onDone?.(),
    })
    return () => controls.stop()
  }, [value, from, duration])

  return <span className={`tabular-nums ${className ?? ''}`}>{display}</span>
}
