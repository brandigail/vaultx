import type { Config } from '@netlify/functions'
import { handle, HttpError, json } from '../lib/http'
import { sessionUserId } from '../lib/session'
import { findUserById, toSessionUser } from '../lib/users'

export default handle(async (req) => {
  const userId = await sessionUserId(req)
  const user = userId ? await findUserById(userId) : null
  if (!user) throw new HttpError(401, 'Not signed in')
  return json({ user: toSessionUser(user) })
})

export const config: Config = { path: '/api/auth/me', method: 'GET' }
