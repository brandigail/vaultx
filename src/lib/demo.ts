/**
 * The demo vault is a throwaway account created in the browser with a public passphrase.
 * Shared with the server so it can recognise and expire demo accounts.
 */
export const DEMO_EMAIL_DOMAIN = 'demo.vaultx.invalid'
export const DEMO_PASSPHRASE = 'demo-vault-passphrase'
export const DEMO_TTL_HOURS = 24

export function demoEmail(): string {
  return `demo-${crypto.randomUUID()}@${DEMO_EMAIL_DOMAIN}`
}

export function isDemoEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`)
}
