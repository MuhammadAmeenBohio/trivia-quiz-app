'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  TrophyIcon, ZapIcon, FlameIcon, ShuffleIcon, GlobeIcon, FlaskConicalIcon,
  LaptopIcon, MedalIcon, MapIcon, LandmarkIcon, ClapperboardIcon, MusicIcon, Gamepad2Icon,
  PawPrintIcon, SparklesIcon, SmileIcon, GaugeIcon, SkipForwardIcon, type LucideIcon,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { playSound } from '@/lib/sound'
import AnimatedNumber from '@/components/AnimatedNumber'
import { HomeIllustration } from '@/components/Illustrations'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CATEGORIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: '', label: 'Anything goes', icon: ShuffleIcon },
  { id: '9', label: 'General', icon: GlobeIcon },
  { id: '17', label: 'Science', icon: FlaskConicalIcon },
  { id: '18', label: 'Computers', icon: LaptopIcon },
  { id: '21', label: 'Sports', icon: MedalIcon },
  { id: '22', label: 'Geography', icon: MapIcon },
  { id: '23', label: 'History', icon: LandmarkIcon },
  { id: '11', label: 'Film', icon: ClapperboardIcon },
  { id: '12', label: 'Music', icon: MusicIcon },
  { id: '15', label: 'Games', icon: Gamepad2Icon },
  { id: '27', label: 'Animals', icon: PawPrintIcon },
]

const DIFFICULTIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: '', label: 'Any', icon: SparklesIcon },
  { id: 'easy', label: 'Easy', icon: SmileIcon },
  { id: 'medium', label: 'Medium', icon: GaugeIcon },
  { id: 'hard', label: 'Hard', icon: FlameIcon },
]

/** Selectable pill row with a radio circle on the right. */
function Choice({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'press flex items-center justify-between gap-3 rounded-full px-5 py-3 text-left text-[0.95rem] font-semibold',
        active ? 'bg-[#EDE9FE] text-foreground' : 'bg-[#F2F2F5] text-foreground hover:bg-[#EAEAF0]'
      )}
    >
      <span className="flex items-center gap-3">
        <Icon className={cn('size-[1.15rem]', active ? 'text-primary' : 'text-muted-foreground')} />
        {label}
      </span>
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full border-2',
          active ? 'border-primary bg-primary' : 'border-[#C9C9D3] bg-white'
        )}
      >
        {active && <span className="size-1.5 rounded-full bg-white" />}
      </span>
    </button>
  )
}

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // the score is stored with the id of the user it belongs to, so a different
  // account never sees the previous account's number
  const [scoreEntry, setScoreEntry] = useState<{ userId: string; value: number } | null>(null)
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [supabase])

  // (re)fetch the high score whenever the signed-in user changes
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    apiFetch('/scores/me')
      .then((d) => !cancelled && setScoreEntry({ userId, value: d.highest_score }))
      .catch(() => !cancelled && setScoreEntry({ userId, value: 0 }))
    return () => {
      cancelled = true
    }
  }, [userId])

  const highScore = scoreEntry && scoreEntry.userId === userId ? scoreEntry.value : null

  function start() {
    playSound('start')
    const qs = new URLSearchParams()
    if (category) qs.set('category', category)
    if (difficulty) qs.set('difficulty', difficulty)
    router.push(`/quiz${qs.size ? `?${qs}` : ''}`)
  }

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center">
        <HomeIllustration className="bob w-56 opacity-60" />
      </div>
    )
  }

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? user?.email?.split('@')[0]

  return (
    <div className="flex flex-col gap-12">
      {/* ---------- hero: plain background, headline + illustration ---------- */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid items-center gap-8 md:grid-cols-2"
      >
        <div>
          <p className="text-sm font-semibold text-primary">
            {user ? `Welcome back, ${firstName}` : 'Free trivia game'}
          </p>
          <h1 className="mt-2 text-5xl font-bold leading-[1.05] text-foreground sm:text-6xl">
            {user ? 'Ready to test your knowledge?' : 'Trivia that talks back.'}
          </h1>
          {user ? (
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Button
                data-silent
                size="lg"
                className="h-14 px-8 text-lg"
                onClick={() => document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Pick a challenge
              </Button>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-accent text-primary">
                  <TrophyIcon className="size-5" />
                </span>
                <div className="leading-tight">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    High score
                  </div>
                  <div className="font-heading text-2xl font-bold tabular-nums text-foreground">
                    {highScore === null ? '--' : <AnimatedNumber value={highScore} duration={1} />}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ size: 'lg' }), 'mt-8 h-14 px-8 text-lg')}>
              Let&apos;s play
            </Link>
          )}
        </div>

        <HomeIllustration className="mx-auto w-full max-w-md" />
      </motion.section>

      {/* ---------- challenge picker (2fr) + scoring notes (1fr) ---------- */}
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {user ? (
          <section id="setup" className="rounded-3xl border border-border bg-white p-6 sm:p-8">
            <h2 className="text-2xl text-foreground">Pick your challenge</h2>
            <p className="mt-1 text-muted-foreground">Choose a topic and how brave you feel.</p>

            <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Category
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => (
                <Choice
                  key={c.id}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                  icon={c.icon}
                  label={c.label}
                />
              ))}
            </div>

            <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Difficulty
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTIES.map((d) => (
                <Choice
                  key={d.id}
                  active={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                  icon={d.icon}
                  label={d.label}
                />
              ))}
            </div>

            <Button data-silent onClick={start} size="lg" className="mt-8 h-14 w-full text-lg">
              Start quiz
            </Button>
          </section>
        ) : (
          <section className="rounded-3xl border border-border bg-white p-6 sm:p-8">
            <h2 className="text-2xl text-foreground">Sign in to save your score</h2>
            <p className="mt-1 text-muted-foreground">Google or email, it takes ten seconds.</p>
            <Link href="/login" className={cn(buttonVariants({ size: 'lg' }), 'mt-6 h-12 px-8')}>
              Sign in
            </Link>
          </section>
        )}

        <aside className="flex flex-col gap-4 px-1 md:pt-2">
          <h2 className="text-lg text-foreground">How scoring works</h2>
          <ul className="flex flex-col gap-4 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <ZapIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                <b className="text-foreground">10 points</b> for a correct first try within 10 seconds,{' '}
                <b className="text-foreground">5</b> if you take longer.
              </p>
            </li>
            <li className="flex gap-3">
              <FlameIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                <b className="text-foreground">3 correct in a row</b> sets off a hat trick.{' '}
                <b className="text-foreground">3 wrong</b> in a row and you get booed.
              </p>
            </li>
            <li className="flex gap-3">
              <SkipForwardIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                <b className="text-foreground">Skipping</b> counts as a wrong answer.
              </p>
            </li>
            <li className="flex gap-3">
              <TrophyIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>Only your best score is kept. Beat it for a special badge.</p>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
