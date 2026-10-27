import { z } from 'zod'
import { request, withBody } from '../../lib/api'
import { publicShareSchema, shareSummarySchema } from '../../types/schemas'
import type { CreateShareLinkRequest } from '../../types/schemas'

const createdResponse = z.object({ share: shareSummarySchema })
const listResponse = z.object({ shares: z.array(shareSummarySchema) })
const publicResponse = z.object({ share: publicShareSchema })
const okResponse = z.object({ ok: z.literal(true) })

export const shareApi = {
  create: (data: CreateShareLinkRequest) =>
    request('/api/share-links', createdResponse, withBody('POST', data)).then((r) => r.share),
  list: (itemId: string) => request(`/api/share-links?itemId=${itemId}`, listResponse).then((r) => r.shares),
  revoke: (id: string) => request(`/api/share-link/${id}`, okResponse, { method: 'DELETE' }),
  /** Public: no session needed, the link itself is the credential. */
  fetchPublic: (id: string) => request(`/api/share-link/${id}`, publicResponse).then((r) => r.share),
}
