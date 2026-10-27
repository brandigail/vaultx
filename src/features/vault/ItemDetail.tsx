import { useState } from 'react'
import { Button } from '../../components/Button'
import { BreachCheck } from '../breach/BreachCheck'
import { ShareDialog } from '../share/ShareDialog'
import { CLIPBOARD_CLEAR_MS, copyWithAutoClear } from './clipboard'
import { ItemFields } from './ItemFields'
import { KIND_LABEL } from './kinds'
import type { VaultEntry } from './useVaultItems'

interface ItemDetailProps {
  entry: VaultEntry
  onEdit: () => void
  onDelete: () => Promise<void>
}

export function ItemDetail({ entry, onEdit, onDelete }: ItemDetailProps) {
  const { title, kind, secret } = entry.data
  const [sharing, setSharing] = useState(false)
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
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button onClick={() => setSharing((s) => !s)} aria-expanded={sharing}>
            Share
          </Button>
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

      {sharing && <ShareDialog itemId={entry.id} item={entry.data} onClose={() => setSharing(false)} />}

      <ItemFields data={entry.data} onCopy={(label, value) => void copy(label, value)} />
      {kind === 'LOGIN' && <BreachCheck password={secret} />}
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-slate-600 dark:text-slate-400">
        {message}
      </p>
    </article>
  )
}
