import { z } from 'zod'
import { request, withBody } from '../../lib/api'
import { vaultItemCipherSchema } from '../../types/schemas'
import type { CreateVaultItemRequest, UpdateVaultItemRequest } from '../../types/schemas'

const itemResponse = z.object({ item: vaultItemCipherSchema })
const listResponse = z.object({ items: z.array(vaultItemCipherSchema) })
const okResponse = z.object({ ok: z.literal(true) })

export const vaultApi = {
  list: () => request('/api/vault/items', listResponse).then((r) => r.items),
  create: (data: CreateVaultItemRequest) =>
    request('/api/vault/items', itemResponse, withBody('POST', data)).then((r) => r.item),
  update: (id: string, data: UpdateVaultItemRequest) =>
    request(`/api/vault/items/${id}`, itemResponse, withBody('PUT', data)).then((r) => r.item),
  remove: (id: string) => request(`/api/vault/items/${id}`, okResponse, { method: 'DELETE' }),
}
