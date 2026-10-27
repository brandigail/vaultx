import { useState, type ReactNode } from 'react'
import { Button } from '../../components/Button'
import type { VaultItemPlain } from '../../types'
import { SECRET_LABEL } from './kinds'

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

interface ItemFieldsProps {
  data: VaultItemPlain
  onCopy: (label: string, value: string) => void
}

/** The read-only view of a decrypted item, shared by the owner's detail view and the public share page. */
export function ItemFields({ data, onCopy }: ItemFieldsProps) {
  const { kind, username, secret, url, notes } = data
  const [revealed, setRevealed] = useState(false)
  const secretLabel = SECRET_LABEL[kind]

  return (
    <>
      <dl>
        {username && (
          <Row label="Username" onCopy={() => onCopy('Username', username)}>
            {username}
          </Row>
        )}
        {kind === 'NOTE' ? (
          <Row label={secretLabel}>
            <span className="whitespace-pre-wrap">{revealed ? secret : '••••••••'}</span>
          </Row>
        ) : (
          <Row label={secretLabel} onCopy={() => onCopy(secretLabel, secret)}>
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
          {revealed ? `Hide ${secretLabel.toLowerCase()}` : `Reveal ${secretLabel.toLowerCase()}`}
        </Button>
      </div>
    </>
  )
}
