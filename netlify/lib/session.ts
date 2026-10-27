import { jwtVerify, SignJWT } from 'jose'
import { jwtSecret } from './env'

const COOKIE = 'vaultx_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(jwtSecret())
}

function cookieValue(req: Request): string | null {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === COOKIE) return rest.join('=')
  }
  return null
}

/** Returns the user id from a valid session cookie, or null. */
export async function sessionUserId(req: Request): Promise<string | null> {
  const token = cookieValue(req)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ['HS256'] })
    return payload.sub ?? null
  } catch {
    return null
  }
}

function attributes(req: Request, maxAge: number): string {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : ''
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`
}

export function sessionCookie(req: Request, token: string): string {
  return `${COOKIE}=${token}; ${attributes(req, MAX_AGE_SECONDS)}`
}

export function clearedSessionCookie(req: Request): string {
  return `${COOKIE}=; ${attributes(req, 0)}`
}
