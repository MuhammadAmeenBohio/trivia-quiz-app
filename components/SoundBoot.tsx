'use client'
import { useEffect } from 'react'
import { playSound, startMusic } from '@/lib/sound'

/**
 * Global audio wiring, so no page has to sprinkle sounds on every button:
 * - starts the background music on the first user gesture (browsers block autoplay)
 * - click blip on any button/link, hover tick on buttons
 */
export default function SoundBoot() {
  useEffect(() => {
    const interactive = (e: Event) =>
      (e.target as HTMLElement | null)?.closest?.('button, a, select, [role="button"]') as
        | HTMLElement
        | null

    let started = false
    const onDown = (e: Event) => {
      if (!started) {
        started = true
        startMusic()
      }
      const el = interactive(e)
      if (el && !(el as HTMLButtonElement).disabled && !el.dataset.silent) playSound('click')
    }

    let lastHover: Element | null = null
    const onOver = (e: Event) => {
      const el = interactive(e)
      if (el && el !== lastHover && !(el as HTMLButtonElement).disabled && !el.dataset.silent) {
        playSound('hover')
      }
      lastHover = el
    }

    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointerover', onOver, true)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointerover', onOver, true)
    }
  }, [])

  return null
}
