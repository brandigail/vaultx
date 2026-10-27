function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

export function databaseUrl(): string {
  return required('DATABASE_URL')
}

export function jwtSecret(): Uint8Array {
  const secret = required('JWT_SECRET')
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
  return new TextEncoder().encode(secret)
}
