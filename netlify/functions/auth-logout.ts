import type { Config } from '@netlify/functions'
import { handle, json } from '../lib/http'
import { clearedSessionCookie } from '../lib/session'

export default handle(async (req) => json({ ok: true }, 200, { 'Set-Cookie': clearedSessionCookie(req) }))

export const config: Config = { path: '/api/auth/logout', method: 'POST' }
