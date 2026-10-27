import { createContext } from 'react'
import type { SessionUser } from '../../types'

/**
 * The derived key exists only in the `unlocked` state, i.e. only in memory.
 * Moving to any other state drops the reference, and nothing here is ever persisted.
 */
export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'locked'; user: SessionUser }
  | { status: 'unlocked'; user: SessionUser; key: CryptoKey }

export interface SessionApi {
  state: SessionState
  register: (email: string, password: string, passphrase: string) => Promise<void>
  /** Creates a throwaway account with sample items and unlocks it. No sign-up needed. */
  startDemo: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  /** Throws `WrongPassphraseError` if the passphrase is incorrect. */
  unlock: (passphrase: string) => Promise<void>
  lock: () => void
  logout: () => Promise<void>
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('Wrong master passphrase')
  }
}

export const SessionContext = createContext<SessionApi | null>(null)
