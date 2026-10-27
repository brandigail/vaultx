import { z } from 'zod'
import type { KeyCheck, PublicShare, ShareLink, ShareSummary, VaultItemCipher, VaultItemPlain, SessionUser } from './index'

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

export const shareSummarySchema = z.object({
  id: z.uuid(),
  itemId: z.uuid(),
  expiresAt: isoDate,
}) satisfies z.ZodType<ShareSummary>

export const publicShareSchema = z.object({
  ciphertext: base64,
  iv: base64,
  expiresAt: isoDate,
}) satisfies z.ZodType<PublicShare>

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

export const updateVaultItemRequestSchema = z.object({
  ciphertext: base64.max(200_000),
  iv: base64.max(64),
})

/** The client picks the id because it is bound into the ciphertext as authenticated data. */
export const createVaultItemRequestSchema = updateVaultItemRequestSchema.extend({ id: z.uuid() })

export const MAX_SHARE_TTL_SECONDS = 30 * 24 * 60 * 60

/** The client picks the share id (bound into the ciphertext); the server sets the expiry from its own clock. */
export const createShareLinkRequestSchema = z.object({
  id: z.uuid(),
  itemId: z.uuid(),
  ciphertext: base64.max(200_000),
  iv: base64.max(64),
  ttlSeconds: z.number().int().min(60).max(MAX_SHARE_TTL_SECONDS),
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type CreateVaultItemRequest = z.infer<typeof createVaultItemRequestSchema>
export type UpdateVaultItemRequest = z.infer<typeof updateVaultItemRequestSchema>
export type CreateShareLinkRequest = z.infer<typeof createShareLinkRequestSchema>
