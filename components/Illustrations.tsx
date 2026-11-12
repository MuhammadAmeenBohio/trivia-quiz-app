// Flat vector illustrations: one accent (purple) on neutrals. Pure SVG, no assets.
const PURPLE = '#6C5CE7'
const TINT = '#EDE9FE'
const MID = '#C4B8FA'
const INK = '#111114'

function Sparkle({ x, y, s = 1, fill = INK, delay = 0 }: { x: number; y: number; s?: number; fill?: string; delay?: number }) {
  return (
    <path
      className="twinkle"
      style={{ animationDelay: `${delay}s` }}
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -14 Q0 0 14 0 Q0 0 0 14 Q0 0 -14 0 Q0 0 0 -14Z"
      fill={fill}
    />
  )
}

function Face({ cx, cy, gap = 34, eye = 10, smile = 26, color = '#fff' }: { cx: number; cy: number; gap?: number; eye?: number; smile?: number; color?: string }) {
  return (
    <g>
      <circle cx={cx - gap} cy={cy} r={eye} fill={color} />
      <circle cx={cx + gap} cy={cy} r={eye} fill={color} />
      <circle cx={cx - gap + 2} cy={cy + 1} r={eye * 0.5} fill={INK} />
      <circle cx={cx + gap + 2} cy={cy + 1} r={eye * 0.5} fill={INK} />
      <path
        d={`M${cx - smile} ${cy + 30} Q${cx} ${cy + 58} ${cx + smile} ${cy + 30}`}
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  )
}

/** Home: two chatty quiz bubbles. */
export function HomeIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 320" className={className} role="img" aria-label="Friendly question bubble">
      <ellipse cx="200" cy="296" rx="120" ry="12" fill={TINT} />
      <g className="bob">
        <path d="M140 200 L116 266 L198 218 Z" fill={PURPLE} />
        <rect x="86" y="46" width="228" height="170" rx="64" fill={PURPLE} />
        <Face cx={200} cy={118} />
        <circle cx="332" cy="82" r="40" fill="#fff" stroke={INK} strokeWidth="5" />
        <text x="332" y="98" textAnchor="middle" fontSize="48" fontWeight="800" fill={PURPLE} fontFamily="inherit">
          ?
        </text>
        <rect x="282" y="204" width="96" height="62" rx="31" fill={TINT} />
        <circle cx="312" cy="235" r="6" fill={PURPLE} />
        <circle cx="330" cy="235" r="6" fill={PURPLE} />
        <circle cx="348" cy="235" r="6" fill={PURPLE} />
      </g>
      <Sparkle x={52} y={96} s={1.2} />
      <Sparkle x={366} y={160} s={0.8} fill={PURPLE} delay={0.8} />
      <Sparkle x={62} y={224} s={0.8} fill={PURPLE} delay={1.4} />
      <circle cx="30" cy="160" r="6" fill={MID} />
      <circle cx="372" cy="36" r="5" fill={INK} />
    </svg>
  )
}

/** Quiz intro: a bright idea. */
export function QuizIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 340" className={className} role="img" aria-label="Smiling light bulb">
      <ellipse cx="200" cy="318" rx="110" ry="11" fill={TINT} />
      <g className="bob">
        <g stroke={INK} strokeWidth="8" strokeLinecap="round">
          <line x1="200" y1="38" x2="200" y2="12" />
          <line x1="279" y1="71" x2="298" y2="52" />
          <line x1="121" y1="71" x2="102" y2="52" />
          <line x1="312" y1="150" x2="338" y2="150" />
          <line x1="88" y1="150" x2="62" y2="150" />
        </g>
        <rect x="158" y="214" width="84" height="26" rx="10" fill={INK} />
        <rect x="170" y="244" width="60" height="22" rx="10" fill={INK} />
        <path d="M168 196 H232 V222 H168 Z" fill={PURPLE} />
        <circle cx="200" cy="150" r="90" fill={PURPLE} />
        <path d="M136 120 Q142 90 168 78" stroke="#fff" strokeOpacity=".4" strokeWidth="9" strokeLinecap="round" fill="none" />
        <Face cx={200} cy={140} />
      </g>
      <Sparkle x={330} y={250} s={1} fill={PURPLE} />
      <Sparkle x={66} y={256} s={0.8} delay={1} />
      <circle cx="352" cy="96" r="6" fill={MID} />
      <circle cx="46" cy="104" r="5" fill={INK} />
    </svg>
  )
}

/** Results: a happy trophy with confetti. */
export function ResultsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 340" className={className} role="img" aria-label="Happy trophy">
      <ellipse cx="200" cy="318" rx="110" ry="11" fill={TINT} />
      <g className="bob">
        <path d="M142 96 H108 Q96 96 96 110 Q96 150 142 158" stroke={PURPLE} strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M258 96 H292 Q304 96 304 110 Q304 150 258 158" stroke={PURPLE} strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M138 58 H262 V132 Q262 196 200 208 Q138 196 138 132 Z" fill={PURPLE} />
        <rect x="186" y="204" width="28" height="42" fill={PURPLE} />
        <rect x="146" y="244" width="108" height="30" rx="12" fill={INK} />
        <path d="M158 80 V128" stroke="#fff" strokeOpacity=".4" strokeWidth="9" strokeLinecap="round" />
        <Face cx={200} cy={106} gap={26} eye={8} smile={20} />
      </g>
      <g>
        <rect x="60" y="70" width="16" height="16" rx="3" fill={PURPLE} transform="rotate(20 68 78)" />
        <rect x="330" y="60" width="14" height="14" rx="3" fill={INK} transform="rotate(-18 337 67)" />
        <rect x="320" y="210" width="16" height="16" rx="3" fill={MID} transform="rotate(32 328 218)" />
        <rect x="70" y="200" width="14" height="14" rx="3" fill={INK} transform="rotate(-30 77 207)" />
        <circle cx="100" cy="40" r="7" fill={MID} />
        <circle cx="300" cy="30" r="7" fill={PURPLE} />
        <circle cx="356" cy="140" r="6" fill={INK} />
        <circle cx="42" cy="140" r="6" fill={PURPLE} />
      </g>
      <Sparkle x={344} y={110} s={1} fill={PURPLE} />
      <Sparkle x={58} y={130} s={0.9} delay={1.1} />
    </svg>
  )
}
