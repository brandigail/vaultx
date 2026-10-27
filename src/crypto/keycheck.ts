import type { KeyCheck } from '../types'
import { DecryptionError, open, seal } from './aes'

const MARKER = 'vaultx-key-check-v1'
const AAD = 'key-check'

export function createKeyCheck(key: CryptoKey): Promise<KeyCheck> {
  return seal(key, MARKER, AAD)
}

/** True only if `key` is the key that produced `check`. */
export async function verifyKeyCheck(key: CryptoKey, check: KeyCheck): Promise<boolean> {
  try {
    return (await open(key, check, AAD)) === MARKER
  } catch (error) {
    if (error instanceof DecryptionError) return false
    throw error
  }
}
