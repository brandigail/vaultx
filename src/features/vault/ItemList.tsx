import { useMemo, useState } from 'react'
import { KIND_LABEL } from './kinds'
import type { VaultEntry } from './useVaultItems'

interface ItemListProps {
  entries: VaultEntry[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Searches only fields that are not the secret itself. */
function matches(entry: VaultEntry, query: string): boolean {
  const { title, username, url } = entry.data
  return [title, username, url].some((v) => v?.toLowerCase().includes(query))
}

export function ItemList({ entries, selectedId, onSelect }: ItemListProps) {
  const [query, setQuery] = useState('')
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? entries.filter((e) => matches(e, q)) : entries
  }, [entries, query])

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search title, username or URL"
        aria-label="Search vault"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900"
      />
      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          {entries.length === 0 ? 'No items yet. Add your first one.' : 'No items match your search.'}
        </p>
      ) : (
        <ul className="space-y-1" aria-label="Vault items">
          {visible.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                aria-current={entry.id === selectedId ? 'true' : undefined}
                className={`w-full rounded-lg border px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  entry.id === selectedId
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="block truncate font-medium">{entry.data.title}</span>
                <span className="block truncate text-sm text-slate-600 dark:text-slate-400">
                  {KIND_LABEL[entry.data.kind]}
                  {entry.data.username ? ` · ${entry.data.username}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
