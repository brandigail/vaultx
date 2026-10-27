import type { Config } from '@netlify/functions'
import { updateVaultItemRequestSchema } from '../../src/types/schemas'
import { idFromPath, requireUserId } from '../lib/auth'
import { handle, HttpError, json, readJson } from '../lib/http'
import { deleteItem, updateItem } from '../lib/vault'

export default handle(async (req) => {
  const userId = await requireUserId(req)
  const id = idFromPath(req)

  if (req.method === 'DELETE') {
    if (!(await deleteItem(userId, id))) throw new HttpError(404, 'Item not found')
    return json({ ok: true })
  }

  const { ciphertext, iv } = await readJson(req, updateVaultItemRequestSchema)
  const item = await updateItem(userId, id, ciphertext, iv)
  if (!item) throw new HttpError(404, 'Item not found')
  return json({ item })
})

export const config: Config = { path: '/api/vault/items/:id', method: ['PUT', 'DELETE'] }
