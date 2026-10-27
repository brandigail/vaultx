import { useEffect, useId, useState } from 'react'
import { Button } from '../../components/Button'
import { createShareKey, encryptShare } from '../../crypto'
import type { ShareSummary, VaultItemPlain } from '../../types'
import { CLIPBOARD_CLEAR_MS, copyWithAutoClear } from '../vault/clipboard'
import { shareApi } from './api'

const LIFETIMES = [
  { seconds: 60 * 60, label: '1 hour' },
  { seconds: 24 * 60 * 60, label: '1 day' },
  { seconds: 7 * 24 * 60 * 60, label: '7 days' },
  { seconds: 30 * 24 * 60 * 60, label: '30 days' },
] as const

interface ShareDialogProps {
  itemId: string
  item: VaultItemPlain
  onClose: () => void
}

export function ShareDialog({ itemId, item, onClose }: ShareDialogProps) {
  const selectId = useId()
  const [ttl, setTtl] = useState<number>(LIFETIMES[1].seconds)
  const [shares, setShares] = useState<ShareSummary[]>([])
  const [fresh, setFresh] = useState<{ id: string; link: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = async () => {
    try {
      setShares(await shareApi.list(itemId))
    } catch {
      setMessage('Could not load your share links.')
    }
  }

  useEffect(() => {
    let cancelled = false
    shareApi
      .list(itemId)
      .then((list) => !cancelled && setShares(list))
      .catch(() => !cancelled && setMessage('Could not load your share links.'))
    return () => {
      cancelled = true
    }
  }, [itemId])

  const create = async () => {
    setBusy(true)
    setMessage('')
    try {
      const id = crypto.randomUUID()
      const { key, fragment } = await createShareKey()
      const sealed = await encryptShare(key, id, item)
      await shareApi.create({ id, itemId, ttlSeconds: ttl, ...sealed })
      await refresh()
      // The key lives only in the fragment, which browsers never send to the server.
      setFresh({ id, link: `${window.location.origin}/s/${id}#${fragment}` })
    } catch {
      setMessage('Could not create the link. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async (link: string) => {
    try {
      await copyWithAutoClear(link)
      setMessage(`Link copied. The clipboard clears in ${CLIPBOARD_CLEAR_MS / 1000} seconds.`)
    } catch {
      setMessage('Could not copy. Select the link and copy it yourself.')
    }
  }

  const revoke = async (id: string) => {
    setBusy(true)
    setMessage('')
    try {
      await shareApi.revoke(id)
      if (fresh?.id === id) setFresh(null)
      await refresh()
      setMessage('Link revoked. It no longer works.')
    } catch {
      setMessage('Could not revoke. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-label="Share this item"
      className="space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Anyone with the link can read a snapshot of this item until it expires or you revoke it. The decryption key is
        inside the link itself, so we never see it, and later edits are not shared.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor={selectId} className="block text-sm font-medium">
            Link expires after
          </label>
          <select
            id={selectId}
            value={ttl}
            onChange={(e) => setTtl(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {LIFETIMES.map(({ seconds, label }) => (
              <option key={seconds} value={seconds}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button variant="primary" onClick={() => void create()} disabled={busy}>
          Create link
        </Button>
        <Button onClick={onClose}>Close</Button>
      </div>

      {fresh && (
        <div className="space-y-2">
          <label htmlFor={`${selectId}-link`} className="block text-sm font-medium">
            Your new link (shown once, so copy it now)
          </label>
          <div className="flex gap-2">
            <input
              id={`${selectId}-link`}
              readOnly
              value={fresh.link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <Button onClick={() => void copy(fresh.link)}>Copy link</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Active links</h3>
        {shares.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No active links.</p>
        ) : (
          <ul aria-label="Active share links" className="divide-y divide-slate-200 dark:divide-slate-800">
            {shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  Expires {new Date(share.expiresAt).toLocaleString()}
                  {share.id === fresh?.id && <span className="ml-2 text-emerald-700 dark:text-emerald-400">new</span>}
                </span>
                <Button
                  variant="danger"
                  onClick={() => void revoke(share.id)}
                  disabled={busy}
                  aria-label={`Revoke link that expires ${new Date(share.expiresAt).toLocaleString()}`}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-sm text-slate-600 dark:text-slate-400">
        {message}
      </p>
    </section>
  )
}
