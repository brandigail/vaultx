import { encryptItem } from '../../crypto'
import type { VaultItemPlain } from '../../types'
import { vaultApi } from '../vault/api'
import { SAMPLE_ITEMS, WELCOME_NOTE } from './items'

async function upload(key: CryptoKey, item: VaultItemPlain): Promise<void> {
  const id = crypto.randomUUID()
  await vaultApi.create({ id, ...(await encryptItem(key, id, item)) })
}

/**
 * Encrypts the sample items in the browser and uploads them like any other item. The welcome
 * note goes last so it is the most recently updated and sits at the top of the list.
 */
export async function seedDemoVault(key: CryptoKey): Promise<void> {
  await Promise.all(SAMPLE_ITEMS.map((item) => upload(key, item)))
  await upload(key, WELCOME_NOTE)
}
