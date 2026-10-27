import { useId, useState } from 'react'
import { Button } from '../../components/Button'
import { DEFAULT_OPTIONS, MAX_LENGTH, MIN_LENGTH, generatePassword, type GeneratorOptions } from './generate'
import { StrengthMeter } from './StrengthMeter'

type ClassKey = 'lower' | 'upper' | 'digits' | 'symbols'

const CLASS_OPTIONS: { key: ClassKey; label: string }[] = [
  { key: 'lower', label: 'Lowercase (a-z)' },
  { key: 'upper', label: 'Uppercase (A-Z)' },
  { key: 'digits', label: 'Numbers (0-9)' },
  { key: 'symbols', label: 'Symbols (!@#…)' },
]

interface GeneratorPanelProps {
  onUse: (password: string) => void
  onClose: () => void
}

export function GeneratorPanel({ onUse, onClose }: GeneratorPanelProps) {
  const id = useId()
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_OPTIONS)
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_OPTIONS))

  const change = (next: GeneratorOptions) => {
    setOptions(next)
    setPassword(generatePassword(next))
  }
  const selectedClasses = CLASS_OPTIONS.filter(({ key }) => options[key]).length

  return (
    <section
      aria-label="Password generator"
      className="space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60"
    >
      <div className="space-y-2">
        <output
          aria-label="Generated password"
          className="block break-all rounded-lg border border-slate-300 bg-white p-3 font-mono text-base dark:border-slate-700 dark:bg-slate-900"
        >
          {password}
        </output>
        <StrengthMeter password={password} />
      </div>

      <div className="space-y-1">
        <label htmlFor={`${id}-length`} className="flex justify-between text-sm font-medium">
          <span>Length</span>
          <span aria-hidden="true">{options.length}</span>
        </label>
        <input
          id={`${id}-length`}
          type="range"
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          value={options.length}
          onChange={(e) => change({ ...options, length: Number(e.target.value) })}
          className="w-full cursor-pointer accent-sky-600"
        />
      </div>

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Character types</legend>
        {CLASS_OPTIONS.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={options[key]}
              disabled={options[key] && selectedClasses === 1}
              onChange={(e) => change({ ...options, [key]: e.target.checked })}
              className="size-4 cursor-pointer accent-sky-600"
            />
            {label}
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={options.avoidAmbiguous}
            onChange={(e) => change({ ...options, avoidAmbiguous: e.target.checked })}
            className="size-4 cursor-pointer accent-sky-600"
          />
          Avoid look-alike characters (O, 0, l, 1, I)
        </label>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => onUse(password)}>
          Use this password
        </Button>
        <Button onClick={() => setPassword(generatePassword(options))}>Regenerate</Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </section>
  )
}
