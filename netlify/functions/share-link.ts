import type { Config } from '@netlify/functions'
import { idFromPath, requireUserId } from '../lib/auth'
import { handle, HttpError, json } from '../lib/http'
import { findPublicShare, revokeShare } from '../lib/shares'

export default handle(async (req) => {
  const id = idFromPath(req)

  if (req.method === 'DELETE') {
    if (!(await revokeShare(await requireUserId(req), id))) throw new HttpError(404, 'Share link not found')
    return json({ ok: true })
  }

  // Public: possession of the link is the credential. One message for unknown, expired and revoked,
  // so the response does not reveal which.
  const share = await findPublicShare(id)
  if (!share) throw new HttpError(410, 'This link is invalid, expired or has been revoked')
  return json({ share })
})

export const config: Config = { path: '/api/share-link/:id', method: ['GET', 'DELETE'] }
