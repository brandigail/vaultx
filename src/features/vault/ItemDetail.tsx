import { useState, type ReactNode } from 'react'
import { Button } from '../../components/Button'
import { BreachCheck } from '../breach/BreachCheck'
import { CLIPBOARD_CLEAR_MS, copyWithAutoClear } from './clipboard'
import { KIND_LABEL, SECRET_LABEL } from './kinds'
import type { VaultEntry } from './useVaultItems'

interface ItemDetailProps {
  entry: VaultEntry
  onEdit: () => void
  onDelete: () => Promise<void>
}

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function Row({ label, children, onCopy }: { label: string; children: ReactNode; onCopy?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 py-3 dark:border-slate-800">
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="break-words">{children}</dd>
      </div>
      {onCopy && (
        <Button onClick={onCopy} aria-label={`Copy ${label.toLowerCase()}`}>
          Copy
        </Button>
      )}
    </div>
  )
}

export function ItemDetail({ entry, onEdit, onDelete }: ItemDetailProps) {
  const { title, kind, username, secret, url, notes } = entry.data
  const [revealed, setRevealed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const copy = async (label: string, value: string) => {
    try {
      await copyWithAutoClear(value)
      setMessage(`${label} copied. The clipboard clears in ${CLIPBOARD_CLEAR_MS / 1000} seconds.`)
    } catch {
      setMessage('Could not copy. Your browser blocked clipboard access.')
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await onDelete()
    } catch {
      setMessage('Could not delete. Please try again.')
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <article className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {KIND_LABEL[kind]} · updated {new Date(entry.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={onEdit}>Edit</Button>
          {confirming ? (
            <Button variant="danger" onClick={() => void remove()} disabled={busy}>
              Confirm delete
            </Button>
          ) : (
            <Button onClick={() => setConfirming(true)}>Delete</Button>
          )}
        </div>
      </header>

      <dl>
        {username && (
          <Row label="Username" onCopy={() => void copy('Username', username)}>
            {username}
          </Row>
        )}
        {kind === 'NOTE' ? (
          <Row label={SECRET_LABEL[kind]}>
            <span className="whitespace-pre-wrap">{revealed ? secret : '••••••••'}</span>
          </Row>
        ) : (
          <Row label={SECRET_LABEL[kind]} onCopy={() => void copy(SECRET_LABEL[kind], secret)}>
            <span className="font-mono">{revealed ? secret : '••••••••••••'}</span>
          </Row>
        )}
        {url && (
          <Row label="Website">
            {isHttpUrl(url) ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline dark:text-sky-400">
                {url}
              </a>
            ) : (
              url
            )}
          </Row>
        )}
        {notes && (
          <Row label="Notes">
            <span className="whitespace-pre-wrap">{notes}</span>
          </Row>
        )}
      </dl>

      <div className="flex items-center gap-2">
        <Button onClick={() => setRevealed((r) => !r)} aria-pressed={revealed}>
          {revealed ? `Hide ${SECRET_LABEL[kind].toLowerCase()}` : `Reveal ${SECRET_LABEL[kind].toLowerCase()}`}
        </Button>
      </div>
      {kind === 'LOGIN' && <BreachCheck password={secret} />}
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-slate-600 dark:text-slate-400">
        {message}
      </p>
    </article>
  )
}
