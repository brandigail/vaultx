import type { Config } from '@netlify/functions'
import { loginRequestSchema } from '../../src/types/schemas'
import { handle, HttpError, json, readJson } from '../lib/http'
import { verifyAgainstDummy, verifyPassword } from '../lib/password'
import { sessionCookie, signSession } from '../lib/session'
import { findUserByEmail, normalizeEmail, toSessionUser } from '../lib/users'

export default handle(async (req) => {
  const { email, password } = await readJson(req, loginRequestSchema)
  const user = await findUserByEmail(normalizeEmail(email))
  const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password)
  if (!user || !valid) throw new HttpError(401, 'Invalid email or password')
  const token = await signSession(user.id)
  return json({ user: toSessionUser(user) }, 200, { 'Set-Cookie': sessionCookie(req, token) })
})

export const config: Config = { path: '/api/auth/login', method: 'POST' }
