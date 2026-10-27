import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import type { VaultItemKind, VaultItemPlain } from '../../types'
import { GeneratorPanel } from '../generator/GeneratorPanel'
import { StrengthMeter } from '../generator/StrengthMeter'
import { KIND_LABEL, KINDS, SECRET_LABEL } from './kinds'

interface ItemFormProps {
  initial?: VaultItemPlain
  onSave: (data: VaultItemPlain) => Promise<void>
  onCancel: () => void
}

const INPUT =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900'

function optional(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? '').trim()
  return text === '' ? undefined : text
}

export function ItemForm({ initial, onSave, onCancel }: ItemFormProps) {
  const [kind, setKind] = useState<VaultItemKind>(initial?.kind ?? 'LOGIN')
  const [secret, setSecret] = useState(initial?.secret ?? '')
  const [showSecret, setShowSecret] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data: VaultItemPlain = {
      title: String(form.get('title')).trim(),
      kind,
      secret: String(form.get('secret')),
      ...(kind === 'LOGIN' && { username: optional(form.get('username')) }),
      ...(kind !== 'NOTE' && { url: optional(form.get('url')), notes: optional(form.get('notes')) }),
    }
    setBusy(true)
    setError(null)
    try {
      await onSave(data)
    } catch {
      setError('Could not save. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">{initial ? 'Edit item' : 'New item'}</h2>
      <div className="space-y-1">
        <label htmlFor="kind" className="block text-sm font-medium">
          Type
        </label>
        <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as VaultItemKind)} className={`${INPUT} cursor-pointer`}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
      <Field label="Title" name="title" defaultValue={initial?.title} maxLength={200} required />
      {kind === 'LOGIN' && (
        <Field label="Username or email" name="username" defaultValue={initial?.username} autoComplete="off" />
      )}
      <div className="space-y-1">
        <label htmlFor="secret" className="block text-sm font-medium">
          {SECRET_LABEL[kind]}
        </label>
        {kind === 'NOTE' ? (
          <textarea
            id="secret"
            name="secret"
            rows={6}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            className={INPUT}
          />
        ) : (
          <div className="flex gap-2">
            <input
              id="secret"
              name="secret"
              type={showSecret ? 'text' : 'password'}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
              className={`${INPUT} min-w-0 font-mono`}
            />
            <Button onClick={() => setShowSecret((s) => !s)} aria-pressed={showSecret}>
              {showSecret ? 'Hide' : 'Show'}
            </Button>
            <Button onClick={() => setGenerating((g) => !g)} aria-expanded={generating}>
              Generate
            </Button>
          </div>
        )}
        {kind === 'LOGIN' && <StrengthMeter password={secret} />}
      </div>
      {generating && kind !== 'NOTE' && (
        <GeneratorPanel
          onUse={(password) => {
            setSecret(password)
            setShowSecret(true)
            setGenerating(false)
          }}
          onClose={() => setGenerating(false)}
        />
      )}
      {kind !== 'NOTE' && (
        <>
          <Field label="Website URL" name="url" type="url" defaultValue={initial?.url} placeholder="https://" />
          <div className="space-y-1">
            <label htmlFor="notes" className="block text-sm font-medium">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={3} defaultValue={initial?.notes} className={INPUT} />
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
