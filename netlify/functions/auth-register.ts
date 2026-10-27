import type { Config } from '@netlify/functions'
import { registerRequestSchema } from '../../src/types/schemas'
import { handle, HttpError, json, readJson } from '../lib/http'
import { hashPassword } from '../lib/password'
import { sessionCookie, signSession } from '../lib/session'
import { createUser, normalizeEmail, toSessionUser } from '../lib/users'

export default handle(async (req) => {
  const { email, password, kdfSalt } = await readJson(req, registerRequestSchema)
  const user = await createUser(normalizeEmail(email), await hashPassword(password), kdfSalt)
  if (!user) throw new HttpError(409, 'An account with that email already exists')
  const token = await signSession(user.id)
  return json({ user: toSessionUser(user) }, 201, { 'Set-Cookie': sessionCookie(req, token) })
})

export const config: Config = { path: '/api/auth/register', method: 'POST' }
