import { useState, type FormEvent } from 'react'
import { AuthLayout } from '../../components/AuthLayout'
import { Field } from '../../components/Field'
import { SubmitButton } from '../../components/SubmitButton'
import { DEMO_PASSPHRASE, isDemoEmail } from '../../lib/demo'
import { WrongPassphraseError } from './sessionContext'
import { useSession } from './useSession'

export function UnlockScreen({ email }: { email: string }) {
  const { unlock, logout } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const passphrase = String(new FormData(event.currentTarget).get('passphrase'))
    setError(null)
    setBusy(true)
    try {
      await unlock(passphrase)
    } catch (e) {
      setError(e instanceof WrongPassphraseError ? e.message : 'Could not unlock. Please try again.')
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Vault locked" subtitle={`Enter your master passphrase to unlock ${email}.`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Master passphrase"
          name="passphrase"
          type="password"
          autoComplete="off"
          hint={isDemoEmail(email) ? `Demo vault: the passphrase is ${DEMO_PASSPHRASE}` : undefined}
          autoFocus
          required
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <SubmitButton busy={busy}>{busy ? 'Unlocking…' : 'Unlock'}</SubmitButton>
      </form>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-4 w-full text-center text-sm text-slate-600 hover:underline dark:text-slate-400"
      >
        Sign out
      </button>
    </AuthLayout>
  )
}
