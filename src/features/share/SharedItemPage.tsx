import { useEffect, useState } from 'react'
import { ThemeToggle } from '../../components/ThemeToggle'
import { decryptShare, importShareKey } from '../../crypto'
import { ApiError } from '../../lib/api'
import type { VaultItemPlain } from '../../types'
import { CLIPBOARD_CLEAR_MS, clearClipboard, copyWithAutoClear } from '../vault/clipboard'
import { ItemFields } from '../vault/ItemFields'
import { KIND_LABEL } from '../vault/kinds'
import { shareApi } from './api'

type State =
  | { status: 'loading' }
  | { status: 'ready'; item: VaultItemPlain; expiresAt: string }
  | { status: 'unavailable' }
  | { status: 'badKey' }
  | { status: 'error' }

const PROBLEMS = {
  unavailable: ['This link is no longer available', 'It may have expired, been revoked, or never existed. Ask the sender for a new one.'],
  badKey: ['This link is incomplete', 'The part of the link after the # is missing or was changed, so it cannot be decrypted. Ask the sender to share it again.'],
  error: ['Could not load this link', 'Check your connection and reload the page.'],
} as const

async function load(id: string): Promise<State> {
  // The key is in the fragment, which the browser never sends to the server.
  const fragment = window.location.hash.slice(1)
  if (fragment === '') return { status: 'badKey' }
  try {
    const share = await shareApi.fetchPublic(id)
    const item = await decryptShare(await importShareKey(fragment), id, share)
    return { status: 'ready', item, expiresAt: share.expiresAt }
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status === 410 ? 'unavailable' : 'error' }
    if (error instanceof TypeError) return { status: 'error' }
    return { status: 'badKey' }
  }
}

export function SharedItemPage({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    void load(id).then((next) => !cancelled && setState(next))
    return () => {
      cancelled = true
      void clearClipboard()
    }
  }, [id])

  const copy = async (label: string, value: string) => {
    try {
      await copyWithAutoClear(value)
      setMessage(`${label} copied. The clipboard clears in ${CLIPBOARD_CLEAR_MS / 1000} seconds.`)
    } catch {
      setMessage('Could not copy. Your browser blocked clipboard access.')
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">VaultX</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Shared with you</p>
        </div>
        <ThemeToggle />
      </header>

      {state.status === 'loading' && <p className="text-slate-500">Decrypting…</p>}

      {state.status === 'ready' && (
        <article className="space-y-4">
          <div>
            <h2 className="break-words text-lg font-semibold">{state.item.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {KIND_LABEL[state.item.kind]} · link expires {new Date(state.expiresAt).toLocaleString()}
            </p>
          </div>
          <ItemFields data={state.item} onCopy={(label, value) => void copy(label, value)} />
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-slate-600 dark:text-slate-400">
            {message}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Decrypted in your browser with the key in the link. The server only ever held the encrypted copy.
          </p>
        </article>
      )}

      {(state.status === 'unavailable' || state.status === 'badKey' || state.status === 'error') && (
        <div role="alert" className="rounded-xl border border-slate-300 p-6 dark:border-slate-700">
          <h2 className="text-lg font-semibold">{PROBLEMS[state.status][0]}</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{PROBLEMS[state.status][1]}</p>
        </div>
      )}
    </main>
  )
}
