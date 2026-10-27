import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { ThemeToggle } from '../../components/ThemeToggle'
import { ApiError } from '../../lib/api'
import { DEMO_PASSPHRASE, DEMO_TTL_HOURS, isDemoEmail } from '../../lib/demo'
import { useIdleLock } from '../auth/useIdleLock'
import { useSession } from '../auth/useSession'
import type { VaultItemPlain } from '../../types'
import { clearClipboard } from './clipboard'
import { ItemDetail } from './ItemDetail'
import { ItemForm } from './ItemForm'
import { ItemList } from './ItemList'
import { useVaultItems } from './useVaultItems'

type Panel = { mode: 'none' } | { mode: 'view'; id: string } | { mode: 'new' } | { mode: 'edit'; id: string }

export function VaultHome({ email, vaultKey }: { email: string; vaultKey: CryptoKey }) {
  const { lock, logout } = useSession()
  const { entries, status, loadError, undecryptable, add, update, remove } = useVaultItems(vaultKey)
  const [panel, setPanel] = useState<Panel>({ mode: 'none' })
  useIdleLock(lock)

  // Locking or signing out unmounts this view: wipe anything we put on the clipboard.
  useEffect(() => () => void clearClipboard(), [])

  // A 401 means the session cookie expired while the vault was open.
  useEffect(() => {
    if (loadError instanceof ApiError && loadError.status === 401) void logout()
  }, [loadError, logout])

  const selected = 'id' in panel ? entries.find((e) => e.id === panel.id) : undefined
  const panelOpen = panel.mode !== 'none'

  const save = async (data: VaultItemPlain) => {
    if (panel.mode === 'edit') {
      await update(panel.id, data)
      setPanel({ mode: 'view', id: panel.id })
    } else {
      setPanel({ mode: 'view', id: await add(data) })
    }
  }

  const renderPanel = () => {
    if (panel.mode === 'new') return <ItemForm onSave={save} onCancel={() => setPanel({ mode: 'none' })} />
    if (!selected) {
      return (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600 dark:border-slate-700 dark:text-slate-400">
          Select an item, or add a new one.
        </p>
      )
    }
    if (panel.mode === 'edit') {
      return <ItemForm key={selected.id} initial={selected.data} onSave={save} onCancel={() => setPanel({ mode: 'view', id: selected.id })} />
    }
    return (
      <ItemDetail
        key={selected.id}
        entry={selected}
        onEdit={() => setPanel({ mode: 'edit', id: selected.id })}
        onDelete={async () => {
          await remove(selected.id)
          setPanel({ mode: 'none' })
        }}
      />
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 px-4 py-4 md:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">VaultX</h1>
          <p className="truncate text-sm text-slate-600 dark:text-slate-400">{email}</p>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
          <Button onClick={lock}>Lock</Button>
          <Button onClick={() => void logout()}>Sign out</Button>
        </div>
      </header>

      {isDemoEmail(email) && (
        <p role="note" className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
          Demo vault with sample data, deleted automatically after {DEMO_TTL_HOURS} hours. Please don't store real
          secrets here. Master passphrase: <span className="font-mono">{DEMO_PASSPHRASE}</span>
        </p>
      )}

      {status === 'loading' && <p className="text-slate-500">Decrypting your vault…</p>}
      {status === 'error' && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          Could not load your vault. Please refresh.
        </p>
      )}
      {undecryptable > 0 && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {undecryptable} item{undecryptable === 1 ? '' : 's'} could not be decrypted and {undecryptable === 1 ? 'is' : 'are'} hidden.
        </p>
      )}

      {status === 'ready' && (
        <div className="grid flex-1 gap-6 md:grid-cols-[20rem_1fr] md:items-start">
          <section aria-label="Items" className={`space-y-3 ${panelOpen ? 'hidden md:block' : ''}`}>
            <Button variant="primary" className="w-full" onClick={() => setPanel({ mode: 'new' })}>
              Add item
            </Button>
            <ItemList
              entries={entries}
              selectedId={'id' in panel ? panel.id : null}
              onSelect={(id) => setPanel({ mode: 'view', id })}
            />
          </section>
          <section aria-label="Details" className={panelOpen ? '' : 'hidden md:block'}>
            {panelOpen && (
              <Button className="mb-4 md:hidden" onClick={() => setPanel({ mode: 'none' })}>
                ← Back
              </Button>
            )}
            {renderPanel()}
          </section>
        </div>
      )}
    </div>
  )
}
