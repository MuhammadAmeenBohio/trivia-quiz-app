'use client'
import { CheckIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PillState = 'idle' | 'correct' | 'wrong' | 'dimmed'

/**
 * Light-gray pill row with a circular radio on the right (Badoo-style).
 * idle: gray row, empty ring · correct: light purple row, filled purple circle
 * wrong: row shakes, dark circle with an X · dimmed: other rows after the question resolves
 */
export default function OptionPill({
  label,
  state,
  disabled,
  onClick,
}: {
  label: string
  state: PillState
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-silent
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === 'correct'}
      className={cn(
        'press flex min-h-[4.5rem] w-full items-center justify-between gap-4 rounded-full px-7 py-4 text-left text-lg font-semibold',
        state === 'idle' && 'bg-[#F2F2F5] text-foreground hover:bg-[#EAEAF0]',
        state === 'correct' && 'bg-[#EDE9FE] text-foreground',
        state === 'wrong' && 'shake bg-[#F2F2F5] text-muted-foreground',
        state === 'dimmed' && 'bg-[#F2F2F5] text-muted-foreground opacity-60'
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors',
          state === 'correct' && 'border-primary bg-primary text-white',
          state === 'wrong' && 'border-foreground bg-foreground text-white',
          (state === 'idle' || state === 'dimmed') && 'border-[#C9C9D3] bg-white'
        )}
      >
        {state === 'correct' && <CheckIcon className="size-4" strokeWidth={3} />}
        {state === 'wrong' && <XIcon className="size-4" strokeWidth={3} />}
      </span>
    </button>
  )
}
