import { fromBase64, toBase64 } from './encoding'

const IV_BYTES = 12

export interface Sealed {
  ciphertext: string
  iv: string
}

export class DecryptionError extends Error {
  constructor() {
    super('Could not decrypt: wrong key or the data was modified')
    this.name = 'DecryptionError'
  }
}

function additionalData(aad: string | undefined): { additionalData?: Uint8Array<ArrayBuffer> } {
  return aad === undefined ? {} : { additionalData: new TextEncoder().encode(aad) }
}

/**
 * AES-256-GCM with a fresh random 96-bit IV per call. `aad` is authenticated but not encrypted;
 * pass the item id to bind a ciphertext to its row so it cannot be swapped for another.
 */
export async function seal(key: CryptoKey, plaintext: string, aad?: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, ...additionalData(aad) },
    key,
    new TextEncoder().encode(plaintext),
  )
  return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) }
}

export async function open(key: CryptoKey, sealed: Sealed, aad?: string): Promise<string> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(sealed.iv), ...additionalData(aad) },
      key,
      fromBase64(sealed.ciphertext),
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    throw new DecryptionError()
  }
}
