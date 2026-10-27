import type { VaultItemPlain } from '../types'
import type { Sealed } from './aes'
import { fromBase64Url, toBase64Url } from './encoding'
import { decryptItem, encryptItem } from './vault'

const KEY_BYTES = 32

export class InvalidShareKeyError extends Error {
  constructor() {
    super('The share key in the link is not valid')
    this.name = 'InvalidShareKeyError'
  }
}

/**
 * A fresh random key for one share. `fragment` is what goes after the `#` in the link: browsers
 * never send it to the server, so the server can store the ciphertext without being able to read it.
 */
export async function createShareKey(): Promise<{ key: CryptoKey; fragment: string }> {
  const raw = crypto.getRandomValues(new Uint8Array(KEY_BYTES))
  return { key: await importShareKey(toBase64Url(raw)), fragment: toBase64Url(raw) }
}

export async function importShareKey(fragment: string): Promise<CryptoKey> {
  let raw: Uint8Array<ArrayBuffer>
  try {
    raw = fromBase64Url(fragment)
  } catch {
    throw new InvalidShareKeyError()
  }
  if (raw.length !== KEY_BYTES) throw new InvalidShareKeyError()
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** Encrypts a snapshot of an item for sharing, bound to the share id so the row cannot be swapped. */
export function encryptShare(key: CryptoKey, shareId: string, item: VaultItemPlain): Promise<Sealed> {
  return encryptItem(key, shareId, item)
}

export function decryptShare(key: CryptoKey, shareId: string, sealed: Sealed): Promise<VaultItemPlain> {
  return decryptItem(key, shareId, sealed)
}
