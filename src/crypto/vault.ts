import { vaultItemPlainSchema } from '../types/schemas'
import type { VaultItemPlain } from '../types'
import { open, seal, type Sealed } from './aes'

/** Encrypts an item, binding the ciphertext to its id. */
export function encryptItem(key: CryptoKey, itemId: string, item: VaultItemPlain): Promise<Sealed> {
  return seal(key, JSON.stringify(item), itemId)
}

/** Decrypts and validates an item; throws if the key is wrong, the data was tampered with or the shape is invalid. */
export async function decryptItem(key: CryptoKey, itemId: string, sealed: Sealed): Promise<VaultItemPlain> {
  return vaultItemPlainSchema.parse(JSON.parse(await open(key, sealed, itemId)))
}
