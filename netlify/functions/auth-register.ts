import type { Config } from '@netlify/functions'
import { isDemoEmail } from '../../src/lib/demo'
import { registerRequestSchema } from '../../src/types/schemas'
import { handle, HttpError, json, readJson } from '../lib/http'
import { hashPassword } from '../lib/password'
import { sessionCookie, signSession } from '../lib/session'
import { createUser, normalizeEmail, purgeExpiredDemoUsers, toSessionUser } from '../lib/users'

export default handle(async (req) => {
  const { email, password, kdfSalt, keyCheck } = await readJson(req, registerRequestSchema)
  const user = await createUser(normalizeEmail(email), await hashPassword(password), kdfSalt, keyCheck)
  if (!user) throw new HttpError(409, 'An account with that email already exists')
  if (isDemoEmail(user.email)) {
    // Housekeeping only: a failure here must not stop the new demo visitor getting in.
    await purgeExpiredDemoUsers().catch(() => console.error('Could not purge expired demo accounts'))
  }
  const token = await signSession(user.id)
  return json({ user: toSessionUser(user) }, 201, { 'Set-Cookie': sessionCookie(req, token) })
})

export const config: Config = { path: '/api/auth/register', method: 'POST' }
