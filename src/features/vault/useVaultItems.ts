import { useCallback, useEffect, useState } from 'react'
import { decryptItem, encryptItem } from '../../crypto'
import type { VaultItemPlain } from '../../types'
import { vaultApi } from './api'

export interface VaultEntry {
  id: string
  updatedAt: string
  data: VaultItemPlain
}

export type LoadStatus = 'loading' | 'ready' | 'error'

const newestFirst = (a: VaultEntry, b: VaultEntry): number => b.updatedAt.localeCompare(a.updatedAt)

/**
 * Loads and decrypts the user's items. Plaintext lives only in this hook's state, so unmounting it
 * (which happens when the vault locks) drops every decrypted value.
 */
export function useVaultItems(key: CryptoKey) {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [loadError, setLoadError] = useState<unknown>(null)
  const [undecryptable, setUndecryptable] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const ciphers = await vaultApi.list()
        const results = await Promise.allSettled(
          ciphers.map(async (c): Promise<VaultEntry> => ({ id: c.id, updatedAt: c.updatedAt, data: await decryptItem(key, c.id, c) })),
        )
        if (cancelled) return
        setEntries(results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])).sort(newestFirst))
        setUndecryptable(results.filter((r) => r.status === 'rejected').length)
        setStatus('ready')
      } catch (error) {
        if (cancelled) return
        setLoadError(error)
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [key])

  const add = useCallback(
    async (data: VaultItemPlain): Promise<string> => {
      const id = crypto.randomUUID()
      const cipher = await vaultApi.create({ id, ...(await encryptItem(key, id, data)) })
      setEntries((prev) => [{ id, updatedAt: cipher.updatedAt, data }, ...prev].sort(newestFirst))
      return id
    },
    [key],
  )

  const update = useCallback(
    async (id: string, data: VaultItemPlain): Promise<void> => {
      const cipher = await vaultApi.update(id, await encryptItem(key, id, data))
      setEntries((prev) => prev.map((e) => (e.id === id ? { id, updatedAt: cipher.updatedAt, data } : e)).sort(newestFirst))
    },
    [key],
  )

  const remove = useCallback(async (id: string): Promise<void> => {
    await vaultApi.remove(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { entries, status, loadError, undecryptable, add, update, remove }
}
