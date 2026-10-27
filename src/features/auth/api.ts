import { z } from 'zod'
import { sessionUserSchema } from '../../types/schemas'
import type { LoginRequest, RegisterRequest } from '../../types/schemas'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

const userResponse = z.object({ user: sessionUserSchema })
const meResponse = z.object({ user: sessionUserSchema.nullable() })
const errorResponse = z.object({ error: z.string() })

async function request<S extends z.ZodType>(path: string, schema: S, init?: RequestInit): Promise<z.infer<S>> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const parsed = errorResponse.safeParse(body)
    throw new ApiError(res.status, parsed.success ? parsed.data.error : 'Something went wrong')
  }
  return schema.parse(body)
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

export const authApi = {
  me: () => request('/api/auth/me', meResponse).then((r) => r.user),
  register: (data: RegisterRequest) => request('/api/auth/register', userResponse, post(data)).then((r) => r.user),
  login: (data: LoginRequest) => request('/api/auth/login', userResponse, post(data)).then((r) => r.user),
  logout: () => request('/api/auth/logout', z.object({ ok: z.literal(true) }), post({})),
}
