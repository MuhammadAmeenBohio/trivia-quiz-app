// Synthesized sound engine (Web Audio API). No audio files required.
// Public API: playSound(name), startMusic(), stopMusic(), isMuted(), setMuted(), subscribeMute()

const MUTE_KEY = 'trivia-quiz-muted'

export type SoundName =
  | 'click'
  | 'hover'
  | 'start'
  | 'correct'
  | 'wrong'
  | 'whoosh'
  | 'tick'
  | 'coin'
  | 'finish'
  | 'highscore'
  | 'streak-win'
  | 'streak-lose'

// ---------- mute state ----------
const listeners = new Set<() => void>()

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(MUTE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, String(muted))
  } catch {
    // ignore
  }
  if (muted) stopMusic()
  else if (musicWanted) startMusic()
  listeners.forEach((l) => l())
}

export function subscribeMute(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

// ---------- audio context ----------
let ctx: AudioContext | null = null
let master: GainNode | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

type ToneOpts = {
  freq: number
  to?: number
  dur: number
  type?: OscillatorType
  vol?: number
  delay?: number
  attack?: number
  dest?: AudioNode
  vibrato?: { rate: number; depth: number }
}

function tone(c: AudioContext, o: ToneOpts) {
  const t0 = c.currentTime + (o.delay ?? 0)
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, t0)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur)
  const vol = o.vol ?? 0.2
  const attack = o.attack ?? 0.008
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur)
  osc.connect(g)
  g.connect(o.dest ?? master!)
  if (o.vibrato) {
    const lfo = c.createOscillator()
    const lg = c.createGain()
    lfo.frequency.value = o.vibrato.rate
    lg.gain.value = o.vibrato.depth
    lfo.connect(lg)
    lg.connect(osc.frequency)
    lfo.start(t0)
    lfo.stop(t0 + o.dur + 0.05)
  }
  osc.start(t0)
  osc.stop(t0 + o.dur + 0.05)
}

let noiseBuf: AudioBuffer | null = null
function noiseBuffer(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

function noise(
  c: AudioContext,
  o: {
    dur: number
    vol?: number
    delay?: number
    filter?: BiquadFilterType
    freq?: number
    freqTo?: number
    q?: number
    attack?: number
    dest?: AudioNode
  }
) {
  const t0 = c.currentTime + (o.delay ?? 0)
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)
  const f = c.createBiquadFilter()
  f.type = o.filter ?? 'bandpass'
  f.frequency.setValueAtTime(o.freq ?? 1500, t0)
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + o.dur)
  f.Q.value = o.q ?? 1
  const g = c.createGain()
  const vol = o.vol ?? 0.2
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack ?? 0.004))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur)
  src.connect(f)
  f.connect(g)
  g.connect(o.dest ?? master!)
  src.start(t0, Math.random())
  src.stop(t0 + o.dur + 0.05)
}

const N = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12)

// ---------- sound effects ----------
const sfx: Record<SoundName, (c: AudioContext) => void> = {
  click: (c) => {
    tone(c, { freq: 520, to: 880, dur: 0.07, type: 'square', vol: 0.08 })
  },
  hover: (c) => {
    tone(c, { freq: 1400, dur: 0.025, type: 'sine', vol: 0.03 })
  },
  start: (c) => {
    // rising "game show" blip run
    ;[0, 4, 7, 12, 16].forEach((s, i) =>
      tone(c, { freq: N(s - 9), dur: 0.16, type: 'square', vol: 0.1, delay: i * 0.07 })
    )
    tone(c, { freq: N(19 - 9), dur: 0.4, type: 'triangle', vol: 0.15, delay: 0.38 })
  },
  correct: (c) => {
    // bright ding-ding-DING arpeggio
    ;[0, 4, 7, 12].forEach((s, i) => {
      tone(c, { freq: N(s + 3), dur: 0.22, type: 'triangle', vol: 0.2, delay: i * 0.06 })
      tone(c, { freq: N(s + 15), dur: 0.15, type: 'sine', vol: 0.06, delay: i * 0.06 })
    })
  },
  wrong: (c) => {
    // cartoon "bzzzt" buzzer + low thud
    tone(c, { freq: 190, to: 90, dur: 0.38, type: 'sawtooth', vol: 0.16 })
    tone(c, { freq: 197, to: 95, dur: 0.38, type: 'square', vol: 0.08 })
    tone(c, { freq: 80, to: 40, dur: 0.25, type: 'sine', vol: 0.3, delay: 0.02 })
  },
  whoosh: (c) => {
    noise(c, { dur: 0.3, vol: 0.12, freq: 400, freqTo: 3500, q: 0.8, attack: 0.1 })
  },
  tick: (c) => {
    tone(c, { freq: 1000, dur: 0.04, type: 'square', vol: 0.07 })
  },
  coin: (c) => {
    tone(c, { freq: N(14), dur: 0.07, type: 'square', vol: 0.09 })
    tone(c, { freq: N(19), dur: 0.22, type: 'square', vol: 0.09, delay: 0.07 })
  },
  finish: (c) => {
    // little descending-then-up wrap-up jingle
    ;[7, 4, 0, 4, 7, 12].forEach((s, i) =>
      tone(c, { freq: N(s - 9), dur: 0.18, type: 'triangle', vol: 0.18, delay: i * 0.11 })
    )
  },
  highscore: (c) => {
    // brass-like fanfare + sparkle shimmer
    const chord = (root: number, delay: number, dur: number) =>
      [0, 4, 7].forEach((s) =>
        tone(c, { freq: N(root + s - 9), dur, type: 'sawtooth', vol: 0.07, delay, attack: 0.02 })
      )
    chord(0, 0, 0.18)
    chord(0, 0.2, 0.18)
    chord(0, 0.4, 0.18)
    chord(5, 0.6, 0.6)
    for (let i = 0; i < 10; i++) {
      tone(c, {
        freq: N(24 + (i % 5) * 2),
        dur: 0.12,
        type: 'sine',
        vol: 0.07,
        delay: 0.6 + i * 0.07,
      })
    }
  },
  'streak-win': (c) => {
    // triumphant stab...
    ;[0, 4, 7].forEach((s) =>
      tone(c, { freq: N(s - 9), dur: 0.5, type: 'sawtooth', vol: 0.08, attack: 0.02 })
    )
    ;[7, 11, 14].forEach((s) =>
      tone(c, { freq: N(s - 9), dur: 0.7, type: 'sawtooth', vol: 0.08, delay: 0.25, attack: 0.02 })
    )
    // ...then the SLOW CLAP
    const clapTimes = [0.9, 1.45, 1.95, 2.4, 2.8, 3.15, 3.45]
    clapTimes.forEach((t, i) => {
      const v = 0.3 + i * 0.03
      noise(c, { dur: 0.09, vol: v, delay: t, filter: 'bandpass', freq: 1800, q: 0.7 })
      noise(c, { dur: 0.05, vol: v * 0.8, delay: t + 0.012, filter: 'highpass', freq: 3500 })
      tone(c, { freq: 160, to: 80, dur: 0.07, type: 'sine', vol: 0.12, delay: t })
    })
  },
  'streak-lose': (c) => {
    // crowd "boooo" + sad trombone
    const boo = (f0: number, f1: number, delay: number, dur: number) => {
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 650
      lp.connect(master!)
      tone(c, {
        freq: f0,
        to: f1,
        dur,
        type: 'sawtooth',
        vol: 0.18,
        delay,
        attack: 0.18,
        dest: lp,
        vibrato: { rate: 5.5, depth: 6 },
      })
    }
    boo(150, 105, 0, 1.4)
    boo(190, 135, 0.05, 1.4)
    boo(120, 85, 0.1, 1.5)
    noise(c, { dur: 1.5, vol: 0.12, freq: 700, q: 0.5, attack: 0.3 })
    // wah wah wah waaah
    ;[[0, 0.35], [-1, 0.35], [-2, 0.35], [-3, 1.0]].forEach(([s, d], i, arr) => {
      const delay = 1.5 + arr.slice(0, i).reduce((a, x) => a + x[1] + 0.05, 0)
      tone(c, {
        freq: N(s - 14),
        to: N(s - 15),
        dur: d,
        type: 'sawtooth',
        vol: 0.12,
        delay,
        attack: 0.03,
        vibrato: { rate: 6, depth: i === 3 ? 10 : 2 },
      })
    })
  },
}

export function playSound(name: SoundName) {
  if (isMuted()) return
  try {
    const c = ac()
    if (c) sfx[name](c)
  } catch {
    // audio is never worth crashing the game
  }
}

// ---------- background music ----------
// A little funky chiptune loop: bass + arp lead + hats/kick, scheduled with lookahead.
const BPM = 112
const STEP = 60 / BPM / 4 // 16th note
// Am - F - C - G, one bar each (16 steps)
const BASS_ROOTS = [-12, -16, -21, -14] // semitones from A4: A2, F2, C2(ish), G2
const ARP = [0, 3, 7, 12, 7, 3, 0, 3] // minor-ish arp offsets
const CHORD_ROOTS = [0, -4, -9, -2] // A, F, C, G relative to A4

let musicWanted = false
let musicTimer: ReturnType<typeof setInterval> | null = null
let nextStepTime = 0
let stepIndex = 0
let musicGain: GainNode | null = null

function scheduleStep(c: AudioContext, step: number, time: number) {
  const bar = Math.floor(step / 16) % 4
  const s = step % 16
  const out = musicGain!
  const at = time - c.currentTime

  // kick on 1 & 9, soft
  if (s === 0 || s === 8 || s === 10) {
    tone(c, { freq: 120, to: 45, dur: 0.15, type: 'sine', vol: 0.5, delay: at, dest: out })
  }
  // snare-ish on 4 & 12
  if (s === 4 || s === 12) {
    noise(c, { dur: 0.1, vol: 0.22, delay: at, freq: 2200, q: 0.6, dest: out })
  }
  // hats on 8ths with offbeat accents
  if (s % 2 === 0) {
    noise(c, {
      dur: 0.035,
      vol: s % 4 === 2 ? 0.1 : 0.05,
      delay: at,
      filter: 'highpass',
      freq: 7000,
      dest: out,
    })
  }
  // funky bass: syncopated
  if ([0, 3, 6, 8, 11, 14].includes(s)) {
    tone(c, {
      freq: N(BASS_ROOTS[bar]),
      dur: STEP * 1.8,
      type: 'sawtooth',
      vol: 0.17,
      delay: at,
      dest: out,
      attack: 0.005,
    })
  }
  // arp lead on every 2nd 16th
  if (s % 2 === 1 || s % 4 === 0) {
    const note = CHORD_ROOTS[bar] + ARP[(s >> 1) % ARP.length]
    tone(c, {
      freq: N(note),
      dur: STEP * 1.5,
      type: 'square',
      vol: 0.045,
      delay: at,
      dest: out,
    })
  }
}

function pump() {
  const c = ctx
  if (!c || !musicGain) return
  while (nextStepTime < c.currentTime + 0.25) {
    scheduleStep(c, stepIndex, nextStepTime)
    nextStepTime += STEP
    stepIndex++
  }
}

export function startMusic() {
  musicWanted = true
  if (isMuted() || musicTimer) return
  const c = ac()
  if (!c) return
  musicGain = c.createGain()
  musicGain.gain.setValueAtTime(0.0001, c.currentTime)
  musicGain.gain.exponentialRampToValueAtTime(0.35, c.currentTime + 1.5) // fade in
  musicGain.connect(master!)
  nextStepTime = c.currentTime + 0.05
  stepIndex = 0
  musicTimer = setInterval(pump, 80)
  pump()
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer)
    musicTimer = null
  }
  if (ctx && musicGain) {
    const g = musicGain
    g.gain.cancelScheduledValues(ctx.currentTime)
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
    setTimeout(() => g.disconnect(), 400)
  }
  musicGain = null
}
