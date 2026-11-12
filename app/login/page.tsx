'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { playSound } from '@/lib/sound'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrainIcon } from 'lucide-react'
import { QuizIllustration } from '@/components/Illustrations'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response: any) => {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
          })
          if (error) {
            playSound('wrong')
            setError(error.message)
          } else {
            playSound('start')
            router.push('/')
          }
          router.refresh()
        },
      })
      // @ts-ignore
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'outline', size: 'large', shape: 'pill' }
      )
    }
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (error) {
      playSound('wrong')
      setError(error.message)
    } else {
      playSound('start')
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
      <Link href="/" className="flex w-fit items-center gap-2">
        <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
          <BrainIcon className="size-5" />
        </span>
        <span className="font-heading text-xl font-bold text-foreground">Trivia Quiz</span>
      </Link>

      <div className="grid flex-1 items-center gap-10 py-8 md:grid-cols-2">
        <QuizIllustration className="mx-auto hidden w-full max-w-sm md:block" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto w-full max-w-md"
        >
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
            {mode === 'signin' ? 'Welcome back' : 'Join the fun'}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">Sign in to save your high score.</p>

          <div id="google-signin-btn" className="mt-6 flex justify-start" />

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              className="h-12 rounded-full border-0 bg-[#F2F2F5] px-5 text-base"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              className="h-12 rounded-full border-0 bg-[#F2F2F5] px-5 text-base"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && (
              <motion.p
                initial={{ x: -10 }}
                animate={{ x: [-10, 10, -6, 6, 0] }}
                className="rounded-2xl bg-[#F2F2F5] px-4 py-2 text-sm font-semibold text-destructive"
              >
                {error}
              </motion.p>
            )}
            <Button type="submit" disabled={loading} size="lg" className="mt-1 h-14 text-lg">
              {loading ? 'Hold on...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="mt-4 w-full text-center text-sm font-semibold text-muted-foreground underline hover:text-foreground"
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
