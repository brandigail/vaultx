import { z } from 'zod'
import { HttpError } from './http'
import { sessionUserId } from './session'

/** Returns the signed-in user's id or throws 401. */
export async function requireUserId(req: Request): Promise<string> {
  const userId = await sessionUserId(req)
  if (!userId) throw new HttpError(401, 'Not signed in')
  return userId
}

/** Reads the trailing path segment as a UUID, e.g. /api/vault/items/:id. */
export function idFromPath(req: Request): string {
  const parsed = z.uuid().safeParse(new URL(req.url).pathname.split('/').pop())
  if (!parsed.success) throw new HttpError(400, 'Invalid id')
  return parsed.data
}
