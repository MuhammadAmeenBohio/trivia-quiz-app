'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftIcon, ArrowRightIcon, FlameIcon, SkipForwardIcon, StarIcon, TimerIcon, XIcon,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { playSound } from '@/lib/sound'
import { initialStreak, nextStreak, STREAK_LENGTH, type StreakState } from '@/lib/streaks'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import AnimatedNumber from '@/components/AnimatedNumber'
import OptionPill, { type PillState } from '@/components/OptionPill'
import { QuizIllustration, ResultsIllustration } from '@/components/Illustrations'
import StreakOverlay, { type StreakFire } from '@/components/StreakOverlay'

type Question = {
  type: 'multiple' | 'boolean'
  category: string
  difficulty: string
  question: string
  options: string[]
  correct_answer: string
}

type AnswerRecord = {
  question_type: 'multiple' | 'boolean'
  is_correct: boolean
  time_taken_seconds: number
}

type Result = { score: number; highest_score: number; new_high_score: boolean }
type Phase = 'answering' | 'retry' | 'resolved'

const FAST_SECONDS = 10
const FULL_HEIGHT = 'min-h-[calc(100dvh-12rem)]'

// module-level so the render-purity lint doesn't mistake event-handler timing for render work
const now = () => Date.now()
let fireCounter = 0

function scoreForFirstAttempt(isCorrect: boolean, type: 'multiple' | 'boolean', timeTaken: number) {
  if (!isCorrect) return 0
  if (type === 'boolean') return 10
  return timeTaken <= FAST_SECONDS ? 10 : 5
}

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [intro, setIntro] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [sessionScore, setSessionScore] = useState(0)

  const [phase, setPhase] = useState<Phase>('answering')
  const [firstCorrect, setFirstCorrect] = useState<boolean | null>(null)
  const [gotItOnRetry, setGotItOnRetry] = useState(false)
  const [wrongOptions, setWrongOptions] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)

  const [streak, setStreak] = useState<StreakState>(initialStreak)
  const [fire, setFire] = useState<StreakFire | null>(null)

  const [result, setResult] = useState<Result | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setIntro(true)
    setError(null)
    setIndex(0)
    setAnswers([])
    setSessionScore(0)
    setPhase('answering')
    setFirstCorrect(null)
    setGotItOnRetry(false)
    setWrongOptions([])
    setStreak(initialStreak)
    setResult(null)
    try {
      const p = new URLSearchParams(window.location.search)
      const qs = new URLSearchParams({ amount: '10' })
      if (p.get('category')) qs.set('category', p.get('category')!)
      if (p.get('difficulty')) qs.set('difficulty', p.get('difficulty')!)
      const data = await apiFetch(`/questions?${qs}`)
      // the API may omit `type`; two options means True/False
      setQuestions(
        data.questions.map((q: Question) => ({
          ...q,
          type: q.type ?? (q.options.length === 2 ? 'boolean' : 'multiple'),
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load a fresh quiz every time the page is shown. Next can keep this page's state alive
  // between visits, so we can't rely on "first mount" alone. The in-flight guard stops
  // StrictMode's double effect from firing two requests (OpenTDB allows 1 req / 5s).
  const inFlight = useRef(false)
  useEffect(() => {
    if (inFlight.current) return
    inFlight.current = true
    load().finally(() => {
      inFlight.current = false
    })
  }, [load])

  // fast-bonus stopwatch, only while a first attempt is pending
  useEffect(() => {
    if (phase !== 'answering' || loading || intro || result) return
    const id = setInterval(() => {
      const s = Math.floor((now() - startRef.current) / 1000)
      setElapsed((prev) => {
        if (s !== prev && s >= FAST_SECONDS - 3 && s <= FAST_SECONDS) playSound('tick')
        return s
      })
    }, 250)
    return () => clearInterval(id)
  }, [phase, loading, intro, result, index])

  const clearFire = useCallback(() => setFire(null), [])

  const current = questions[index]

  function begin() {
    playSound('start')
    setIntro(false)
    setElapsed(0)
    startRef.current = now()
  }

  // Records the first attempt at a question (an answer or a skip): score, answer log, streak
  // and sound. A skip is recorded exactly like a wrong answer.
  function recordFirstAttempt(q: Question, isCorrect: boolean) {
    const timeTaken = (now() - startRef.current) / 1000
    setFirstCorrect(isCorrect)
    setSessionScore((s) => s + scoreForFirstAttempt(isCorrect, q.type, timeTaken))
    setAnswers((a) => [
      ...a,
      { question_type: q.type, is_correct: isCorrect, time_taken_seconds: timeTaken },
    ])

    // streaks are judged on first attempts
    const { state, event } = nextStreak(streak, isCorrect)
    setStreak(state)

    if (event) {
      setFire({ kind: event, id: ++fireCounter })
      playSound(event === 'hat-trick' ? 'streak-win' : 'streak-lose')
    } else {
      playSound(isCorrect ? 'correct' : 'wrong')
    }
  }

  function handleSelect(option: string) {
    if (!current || phase === 'resolved') return
    const isCorrect = option === current.correct_answer

    if (phase === 'answering') {
      recordFirstAttempt(current, isCorrect)
      if (isCorrect) {
        setPhase('resolved')
      } else if (current.type === 'multiple') {
        setWrongOptions([option])
        setPhase('retry') // one more try (worth no points)
      } else {
        setWrongOptions([option]) // True/False has no second try
        setPhase('resolved')
      }
    } else {
      // second attempt: either way the question is finished and the answer is revealed
      if (!isCorrect) setWrongOptions((w) => [...w, option])
      setGotItOnRetry(isCorrect)
      playSound(isCorrect ? 'correct' : 'wrong')
      setPhase('resolved')
    }
  }

  // Skip: give up on the question and reveal the correct answer. Skipping before any attempt
  // counts as a wrong answer; after a wrong attempt that wrong answer is already counted.
  function skip() {
    if (!current || phase === 'resolved') return
    if (phase === 'answering') recordFirstAttempt(current, false)
    setPhase('resolved')
  }

  function next() {
    if (!current) return
    if (index + 1 < questions.length) {
      playSound('whoosh')
      setIndex((i) => i + 1)
      setPhase('answering')
      setFirstCorrect(null)
      setGotItOnRetry(false)
      setWrongOptions([])
      setElapsed(0)
      startRef.current = now()
    } else {
      submit()
    }
  }

  // The single navigation button: skips (reveals the answer) until the question is finished,
  // then moves on.
  function onArrow() {
    if (phase === 'resolved') next()
    else skip()
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const data: Result = await apiFetch('/submit-score', {
        method: 'POST',
        body: JSON.stringify({ answers }),
      })
      setResult(data)
      playSound('finish')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your score')
    } finally {
      setSubmitting(false)
    }
  }

  function celebrateHighScore() {
    playSound('highscore')
    const colors = ['#6C5CE7', '#A99BF5', '#EDE9FE', '#111114']
    confetti({ particleCount: 140, spread: 100, origin: { y: 0.55 }, colors })
    setTimeout(() => confetti({ particleCount: 90, spread: 140, origin: { y: 0.4 }, colors }), 350)
  }

  // ---------- error ----------
  if (error && !current) {
    return (
      <div className={cn('flex items-center justify-center', FULL_HEIGHT)}>
        <div className="max-w-md text-center">
          <QuizIllustration className="mx-auto w-48 opacity-70" />
          <h1 className="mt-4 text-3xl text-foreground">Oops, the quiz tripped.</h1>
          <p className="mt-2 break-words text-sm text-muted-foreground">{error}</p>
          <Button onClick={load} size="lg" className="mt-6 h-12 px-8">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  // ---------- intro (also the loading state) ----------
  if (loading || intro) {
    return (
      <div className={cn('mx-auto flex w-full max-w-xl flex-col items-center justify-center text-center', FULL_HEIGHT)}>
        <QuizIllustration className="w-full max-w-xs" />
        <h1 className="mt-6 text-4xl font-bold text-foreground sm:text-5xl">
          {loading ? 'Cooking up questions…' : 'Ready to test your knowledge?'}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {loading
            ? 'Fetching fresh trivia just for you.'
            : `${questions.length} questions. Answer fast for full points.`}
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-14 px-8 text-lg')}>
            Back
          </Link>
          <Button data-silent size="lg" className="h-14 px-10 text-lg" disabled={loading} onClick={begin}>
            Let&apos;s go
          </Button>
        </div>
      </div>
    )
  }

  // ---------- results ----------
  if (result) {
    return (
      <div className={cn('mx-auto flex w-full max-w-xl flex-col items-center justify-center text-center', FULL_HEIGHT)}>
        <StreakOverlay fire={fire} onDone={clearFire} />
        <ResultsIllustration className="w-full max-w-xs" />
        <h1 className="mt-4 text-4xl font-bold text-foreground sm:text-5xl">Quiz complete!</h1>
        <p className="mt-2 text-lg text-muted-foreground">You scored</p>
        <div className="font-heading text-8xl font-bold leading-none text-foreground">
          <AnimatedNumber
            value={result.score}
            onTick={() => playSound('coin')}
            onDone={() => result.new_high_score && celebrateHighScore()}
          />
        </div>

        <div className="mt-5 min-h-12">
          {result.new_high_score ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.7, type: 'spring', stiffness: 300, damping: 12 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-lg font-bold text-white"
            >
              <StarIcon className="size-5 fill-white" /> New high score!
            </motion.div>
          ) : (
            <p className="text-lg font-semibold text-muted-foreground">
              Best: <span className="tabular-nums text-foreground">{result.highest_score}</span>
            </p>
          )}
        </div>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
          <Button
            data-silent
            size="lg"
            className="h-14 flex-1 text-lg"
            onClick={() => {
              playSound('start')
              load()
            }}
          >
            Play again
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-14 flex-1 text-lg')}
          >
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  if (!current) {
    return (
      <div className={cn('flex items-center justify-center text-center', FULL_HEIGHT)}>
        <div>
          <h1 className="text-3xl text-foreground">No questions available.</h1>
          <Link href="/" className="mt-4 inline-block text-muted-foreground underline">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  // ---------- quiz ----------
  const resolved = phase === 'resolved'
  const fastLeft = Math.max(0, FAST_SECONDS - elapsed)
  const lastQuestion = index + 1 === questions.length
  const progress = ((index + (resolved ? 1 : 0)) / questions.length) * 100

  function pillState(option: string): PillState {
    if (resolved && option === current.correct_answer) return 'correct'
    if (wrongOptions.includes(option)) return 'wrong'
    if (resolved) return 'dimmed'
    return 'idle'
  }

  return (
    <div className={cn('mx-auto flex w-full max-w-2xl flex-col', FULL_HEIGHT)}>
      <StreakOverlay fire={fire} onDone={clearFire} />

      {/* top bar: close (left), score + streak (right) */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="Quit quiz"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-lg' }), 'size-11 rounded-full bg-[#F2F2F5]')}
        >
          <XIcon className="size-5" />
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {streak.correct > 0 && (
            <motion.span
              key={`c${streak.correct}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-accent-foreground"
            >
              <FlameIcon className="size-4" /> {streak.correct}/{STREAK_LENGTH}
            </motion.span>
          )}
          {streak.wrong > 0 && (
            <motion.span
              key={`w${streak.wrong}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-[#F2F2F5] px-3 py-1.5 text-muted-foreground"
            >
              {streak.wrong}/{STREAK_LENGTH} misses
            </motion.span>
          )}
          <motion.span
            key={sessionScore}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 rounded-full bg-[#F2F2F5] px-3 py-1.5 tabular-nums text-foreground"
          >
            <StarIcon className="size-4 text-primary" /> {sessionScore}
          </motion.span>
        </div>
      </div>

      {/* question + options, vertically centred in the remaining space */}
      <div className="flex flex-1 flex-col justify-center py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22 }}
          >
            <p className="text-sm font-semibold text-primary">
              {current.category} · <span className="capitalize">{current.difficulty}</span>
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              {current.question}
            </h1>
            <p className="mt-3 flex min-h-6 items-center gap-2 text-muted-foreground">
              {phase === 'answering' && current.type === 'multiple' ? (
                <>
                  <TimerIcon className="size-4" />
                  {fastLeft > 0 ? `${fastLeft}s left for full points` : '5 points available'}
                </>
              ) : phase === 'retry' ? (
                'Not quite. Try once more (no points on a retry).'
              ) : resolved ? (
                firstCorrect
                  ? 'Correct!'
                  : gotItOnRetry
                    ? 'Got it on the second try (no points).'
                    : `The answer was ${current.correct_answer}`
              ) : (
                'Pick one'
              )}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {current.options.map((option) => (
                <OptionPill
                  key={option}
                  label={option}
                  state={pillState(option)}
                  disabled={resolved || wrongOptions.includes(option)}
                  onClick={() => handleSelect(option)}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {error && <p className="mt-4 text-center text-sm font-semibold text-destructive">{error}</p>}
      </div>

      {/* bottom navigation: prev, progress, next */}
      <div className="mx-auto flex w-full max-w-md items-center gap-4">
        <Button
          variant="outline"
          size="icon-lg"
          className="size-14 shrink-0 rounded-full"
          disabled
          aria-label="Previous question (locked)"
          title="Answers can't be changed once given"
        >
          <ArrowLeftIcon className="size-5" />
        </Button>

        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E4E4EC]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={index + (resolved ? 1 : 0)}
          aria-label={`Question ${index + 1} of ${questions.length}`}
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>

        <Button
          data-silent
          size="icon-lg"
          variant={resolved ? 'default' : 'outline'}
          className="size-14 shrink-0 rounded-full"
          disabled={submitting}
          onClick={onArrow}
          aria-label={resolved ? (lastQuestion ? 'Finish quiz' : 'Next question') : 'Skip and show the answer'}
          title={resolved ? undefined : 'Skip and show the answer'}
        >
          {resolved ? <ArrowRightIcon className="size-5" /> : <SkipForwardIcon className="size-5" />}
        </Button>
      </div>
      <p className="mt-3 min-h-5 text-center text-xs text-muted-foreground">
        {phase === 'answering' && 'Not sure? Tap the arrow to skip and see the answer. A skip counts as wrong.'}
        {phase === 'retry' && 'Tap the arrow to give up and see the answer.'}
      </p>
    </div>
  )
}
