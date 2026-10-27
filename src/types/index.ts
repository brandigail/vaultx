export interface User {
  id: string
  email: string
  passwordHash: string
  kdfSalt: string
  createdAt: string
}

/** What the server may return to the client: never the password hash. */
export type SessionUser = Pick<User, 'id' | 'email' | 'kdfSalt'>

export interface VaultItemCipher {
  id: string
  userId: string
  ciphertext: string
  iv: string
  updatedAt: string
}

export type VaultItemKind = 'LOGIN' | 'NOTE' | 'API_KEY'

export interface VaultItemPlain {
  title: string
  kind: VaultItemKind
  username?: string
  secret: string
  url?: string
  notes?: string
}

export interface ShareLink {
  id: string
  itemId: string
  ciphertext: string
  iv: string
  expiresAt: string
  revokedAt: string | null
}
