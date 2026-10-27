import { z } from 'zod'
import type { KeyCheck, ShareLink, VaultItemCipher, VaultItemPlain, SessionUser } from './index'

const isoDate = z.iso.datetime({ offset: true })
const base64 = z.string().min(1).regex(/^[A-Za-z0-9+/_-]+={0,2}$/, 'Expected base64 or base64url')

export const vaultItemPlainSchema = z.object({
  title: z.string().trim().min(1).max(200),
  kind: z.enum(['LOGIN', 'NOTE', 'API_KEY']),
  username: z.string().max(320).optional(),
  secret: z.string().min(1).max(10_000),
  url: z.string().max(2048).optional(),
  notes: z.string().max(10_000).optional(),
}) satisfies z.ZodType<VaultItemPlain>

export const keyCheckSchema = z.object({
  ciphertext: base64.max(1024),
  iv: base64.max(64),
}) satisfies z.ZodType<KeyCheck>

export const sessionUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  kdfSalt: base64,
  keyCheck: keyCheckSchema,
}) satisfies z.ZodType<SessionUser>

export const vaultItemCipherSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  ciphertext: base64,
  iv: base64,
  updatedAt: isoDate,
}) satisfies z.ZodType<VaultItemCipher>

export const shareLinkSchema = z.object({
  id: z.uuid(),
  itemId: z.uuid(),
  ciphertext: base64,
  iv: base64,
  expiresAt: isoDate,
  revokedAt: isoDate.nullable(),
}) satisfies z.ZodType<ShareLink>

// Request bodies. Note there is no plaintext field anywhere: the server only sees ciphertext.

export const registerRequestSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(10).max(256),
  kdfSalt: base64,
  keyCheck: keyCheckSchema,
})

export const loginRequestSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(256),
})

export const upsertVaultItemRequestSchema = z.object({
  ciphertext: base64.max(200_000),
  iv: base64.max(64),
})

export const createShareLinkRequestSchema = z.object({
  itemId: z.uuid(),
  ciphertext: base64.max(200_000),
  iv: base64.max(64),
  expiresAt: isoDate,
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type UpsertVaultItemRequest = z.infer<typeof upsertVaultItemRequestSchema>
export type CreateShareLinkRequest = z.infer<typeof createShareLinkRequestSchema>
