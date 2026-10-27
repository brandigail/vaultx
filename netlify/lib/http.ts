import type { z } from 'zod'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

/** Parses a JSON body against a schema. Only JSON content is accepted, which also blocks simple cross-site form posts. */
export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json')
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new HttpError(400, 'Invalid JSON')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new HttpError(400, 'Invalid request')
  return parsed.data
}

/** Wraps a handler so errors become JSON responses. Request bodies are never logged. */
export function handle(fn: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    try {
      return await fn(req)
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status)
      console.error('Unhandled error:', error instanceof Error ? error.message : 'unknown')
      return json({ error: 'Internal error' }, 500)
    }
  }
}
