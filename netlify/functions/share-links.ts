import type { Config } from '@netlify/functions'
import { z } from 'zod'
import { createShareLinkRequestSchema } from '../../src/types/schemas'
import { requireUserId } from '../lib/auth'
import { handle, HttpError, json, readJson } from '../lib/http'
import { countActiveShares, createShare, listShares, MAX_ACTIVE_SHARES_PER_USER } from '../lib/shares'

export default handle(async (req) => {
  const userId = await requireUserId(req)

  if (req.method === 'GET') {
    const itemId = z.uuid().safeParse(new URL(req.url).searchParams.get('itemId'))
    if (!itemId.success) throw new HttpError(400, 'itemId is required')
    return json({ shares: await listShares(userId, itemId.data) })
  }

  const input = await readJson(req, createShareLinkRequestSchema)
  if ((await countActiveShares(userId)) >= MAX_ACTIVE_SHARES_PER_USER) {
    throw new HttpError(429, 'Too many active share links. Revoke some first.')
  }
  const share = await createShare(userId, input)
  if (!share) throw new HttpError(404, 'Item not found')
  return json({ share }, 201)
})

export const config: Config = { path: '/api/share-links', method: ['GET', 'POST'] }
