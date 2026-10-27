import { estimateStrength, type StrengthLevel } from './strength'

const BAR: Record<StrengthLevel, string> = {
  0: 'bg-red-600',
  1: 'bg-orange-500',
  2: 'bg-amber-500',
  3: 'bg-lime-600',
  4: 'bg-emerald-600',
}

export function StrengthMeter({ password }: { password: string }) {
  if (password === '') return null
  const { bits, level, label } = estimateStrength(password)
  return (
    <div className="space-y-1">
      <div
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={level}
        aria-valuetext={`${label}, about ${bits} bits of entropy`}
        className="flex gap-1"
      >
        {[0, 1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 flex-1 rounded-full ${segment < Math.max(1, level) ? BAR[level] : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400" aria-hidden="true">
        {label} · about {bits} bits
      </p>
    </div>
  )
}
