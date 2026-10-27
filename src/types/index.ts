/** A known marker encrypted with the master-passphrase key, used to verify the passphrase on unlock. */
export interface KeyCheck {
  ciphertext: string
  iv: string
}

export interface User {
  id: string
  email: string
  passwordHash: string
  kdfSalt: string
  keyCheck: KeyCheck
  createdAt: string
}

/** What the server may return to the client: never the password hash. */
export type SessionUser = Pick<User, 'id' | 'email' | 'kdfSalt' | 'keyCheck'>

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

/** A live share as its owner sees it. The key exists only inside the link itself, so it is never listed. */
export type ShareSummary = Pick<ShareLink, 'id' | 'itemId' | 'expiresAt'>

/** What the public endpoint serves to anyone holding the link. */
export type PublicShare = Pick<ShareLink, 'ciphertext' | 'iv' | 'expiresAt'>
