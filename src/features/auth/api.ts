import { z } from 'zod'
import { request, withBody } from '../../lib/api'
import { sessionUserSchema } from '../../types/schemas'
import type { LoginRequest, RegisterRequest } from '../../types/schemas'

const userResponse = z.object({ user: sessionUserSchema })
const meResponse = z.object({ user: sessionUserSchema.nullable() })

export const authApi = {
  me: () => request('/api/auth/me', meResponse).then((r) => r.user),
  register: (data: RegisterRequest) => request('/api/auth/register', userResponse, withBody('POST', data)).then((r) => r.user),
  login: (data: LoginRequest) => request('/api/auth/login', userResponse, withBody('POST', data)).then((r) => r.user),
  logout: () => request('/api/auth/logout', z.object({ ok: z.literal(true) }), withBody('POST', {})),
}
