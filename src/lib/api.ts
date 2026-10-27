import { z } from 'zod'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

const errorResponse = z.object({ error: z.string() })

export async function request<S extends z.ZodType>(path: string, schema: S, init?: RequestInit): Promise<z.infer<S>> {
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

export const withBody = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
})
