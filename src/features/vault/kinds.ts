import type { VaultItemKind } from '../../types'

export const KIND_LABEL: Record<VaultItemKind, string> = {
  LOGIN: 'Login',
  NOTE: 'Secure note',
  API_KEY: 'API key',
}

export const SECRET_LABEL: Record<VaultItemKind, string> = {
  LOGIN: 'Password',
  NOTE: 'Note',
  API_KEY: 'API key',
}

export const KINDS: VaultItemKind[] = ['LOGIN', 'NOTE', 'API_KEY']
