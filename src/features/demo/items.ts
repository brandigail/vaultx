import type { VaultItemPlain } from '../../types'

/** Every credential here is fake. They exist so the demo vault looks lived-in. */
export const WELCOME_NOTE: VaultItemPlain = {
  title: 'Welcome to the VaultX demo',
  kind: 'NOTE',
  secret: [
    'This is a throwaway vault with sample data. Everything in it is fake, and it is deleted automatically.',
    '',
    'Things to try:',
    '• Reveal and copy a password. The clipboard clears itself after 30 seconds.',
    '• Open "Old forum login" and run Check for breaches (only 5 characters of a hash leave your browser).',
    '• Edit an item and press Generate to see the password generator and strength meter.',
    '• Press Share to make a time-limited link, open it in a private window, then revoke it.',
    '• Press Lock, then unlock with the demo passphrase.',
    '',
    'Behind the scenes: your passphrase never leaves the browser, and the server only stores ciphertext.',
  ].join('\n'),
}

export const SAMPLE_ITEMS: VaultItemPlain[] = [
  {
    title: 'GitHub',
    kind: 'LOGIN',
    username: 'alex.morgan@example.com',
    secret: 'kT7#pQ2!vXm9@Lr4wZ',
    url: 'https://github.com/login',
    notes: 'Two-factor authentication is on (authenticator app).',
  },
  {
    title: 'Google Workspace',
    kind: 'LOGIN',
    username: 'alex@acme-studio.example',
    secret: 'Rn8$wB5^hJd2&cYq6M',
    url: 'https://accounts.google.com',
  },
  {
    title: 'Netflix',
    kind: 'LOGIN',
    username: 'alex.morgan@example.com',
    secret: 'Spring2024!',
    url: 'https://www.netflix.com/login',
    notes: 'Shared with the family. A bit predictable: try the strength meter.',
  },
  {
    title: 'Old forum login',
    kind: 'LOGIN',
    username: 'alexm88',
    secret: 'password123',
    url: 'https://forum.example.com',
    notes: 'Reused on several sites years ago. Run Check for breaches on this one.',
  },
  {
    title: 'Home Wi-Fi',
    kind: 'LOGIN',
    username: 'AcmeMesh-5G',
    secret: 'plum-harbour-lantern-47',
  },
  {
    title: 'Stripe (test mode)',
    kind: 'API_KEY',
    secret: 'sk_test_DEMO_51N0tAReal0000000000000000',
    url: 'https://dashboard.stripe.com/test/apikeys',
    notes: 'Test-mode key, safe to leak.',
  },
  {
    title: 'Groq API key',
    kind: 'API_KEY',
    secret: 'gsk_DEMO_not_a_real_key_0000000000000000',
    url: 'https://console.groq.com/keys',
  },
  {
    title: 'Neon database URL',
    kind: 'API_KEY',
    secret: 'postgresql://demo_user:demo_pass@ep-demo-000000.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    url: 'https://console.neon.tech',
  },
  {
    title: 'Backup recovery codes',
    kind: 'NOTE',
    secret: ['4821-9937', '1076-5524', '7390-2218', '6643-0851', '9152-4476'].join('\n'),
  },
]
