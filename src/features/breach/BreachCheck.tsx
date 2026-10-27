import { useState } from 'react'
import { Button } from '../../components/Button'
import { breachCount } from './hibp'

type Outcome = { kind: 'checking' } | { kind: 'done'; count: number } | { kind: 'error' }

/**
 * Opt-in breach check. The result belongs to the exact password that was checked, so editing
 * the password drops a stale "not found" instead of vouching for something else.
 */
export function BreachCheck({ password }: { password: string }) {
  const [result, setResult] = useState<{ checked: string; outcome: Outcome } | null>(null)
  const outcome = result?.checked === password ? result.outcome : null

  const run = async () => {
    setResult({ checked: password, outcome: { kind: 'checking' } })
    try {
      setResult({ checked: password, outcome: { kind: 'done', count: await breachCount(password) } })
    } catch {
      setResult({ checked: password, outcome: { kind: 'error' } })
    }
  }

  if (password === '') return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button onClick={() => void run()} disabled={outcome?.kind === 'checking'}>
        {outcome?.kind === 'checking' ? 'Checking…' : 'Check for breaches'}
      </Button>
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {outcome?.kind === 'done' && outcome.count > 0 && (
          <span className="font-medium text-red-700 dark:text-red-400">
            Found in {outcome.count.toLocaleString()} known {outcome.count === 1 ? 'breach' : 'breaches'}. Do not use this password.
          </span>
        )}
        {outcome?.kind === 'done' && outcome.count === 0 && (
          <span className="text-emerald-700 dark:text-emerald-400">Not found in known breaches.</span>
        )}
        {outcome?.kind === 'error' && (
          <span className="text-amber-700 dark:text-amber-400">Could not check right now. Try again later.</span>
        )}
      </p>
      <p className="basis-full text-xs text-slate-500 dark:text-slate-400">
        Only the first 5 characters of a hash are sent; your password never leaves this device.
      </p>
    </div>
  )
}
