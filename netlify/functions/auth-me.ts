import type { Config } from '@netlify/functions'
import { handle, json } from '../lib/http'
import { sessionUserId } from '../lib/session'
import { findUserById, toSessionUser } from '../lib/users'

export default handle(async (req) => {
  const userId = await sessionUserId(req)
  const user = userId ? await findUserById(userId) : null
  // 200 with a null user (not 401) so a signed-out visit does not log a console error.
  return json({ user: user ? toSessionUser(user) : null })
})

export const config: Config = { path: '/api/auth/me', method: 'GET' }
