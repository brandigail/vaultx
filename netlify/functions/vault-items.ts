import type { Config } from '@netlify/functions'
import { createVaultItemRequestSchema } from '../../src/types/schemas'
import { requireUserId } from '../lib/auth'
import { handle, HttpError, json, readJson } from '../lib/http'
import { countItems, createItem, listItems, MAX_ITEMS_PER_USER } from '../lib/vault'

export default handle(async (req) => {
  const userId = await requireUserId(req)

  if (req.method === 'GET') return json({ items: await listItems(userId) })

  const { id, ciphertext, iv } = await readJson(req, createVaultItemRequestSchema)
  if ((await countItems(userId)) >= MAX_ITEMS_PER_USER) throw new HttpError(403, 'Vault item limit reached')
  const item = await createItem(userId, id, ciphertext, iv)
  if (!item) throw new HttpError(409, 'An item with that id already exists')
  return json({ item }, 201)
})

export const config: Config = { path: '/api/vault/items', method: ['GET', 'POST'] }
