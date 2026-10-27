import { useState, type FormEvent } from 'react'
import { AuthLayout } from '../../components/AuthLayout'
import { Field } from '../../components/Field'
import { SubmitButton } from '../../components/SubmitButton'
import { ApiError } from '../../lib/api'
import { useSession } from './useSession'

const MIN_PASSPHRASE = 12

export function AuthScreen() {
  const { register, login } = useSession()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))
    const passphrase = String(form.get('passphrase') ?? '')

    if (mode === 'register') {
      if (passphrase.length < MIN_PASSPHRASE) return setError(`The master passphrase needs at least ${MIN_PASSPHRASE} characters.`)
      if (passphrase !== String(form.get('passphrase2'))) return setError('The master passphrases do not match.')
      if (passphrase === password) return setError('The master passphrase must be different from your account password.')
    }

    setError(null)
    setBusy(true)
    try {
      await (mode === 'register' ? register(email, password, passphrase) : login(email, password))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  const registering = mode === 'register'
  return (
    <AuthLayout
      title={registering ? 'Create your vault' : 'Welcome back'}
      subtitle={registering ? 'Your secrets are encrypted in this browser before they are saved.' : 'Sign in to your account.'}
    >
      <form onSubmit={onSubmit} className="space-y-4" key={mode}>
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Account password"
          name="password"
          type="password"
          autoComplete={registering ? 'new-password' : 'current-password'}
          minLength={registering ? 10 : undefined}
          hint={registering ? 'Signs you in. At least 10 characters.' : undefined}
          required
        />
        {registering && (
          <>
            <Field
              label="Master passphrase"
              name="passphrase"
              type="password"
              autoComplete="off"
              hint={`Encrypts your vault. At least ${MIN_PASSPHRASE} characters, different from your password.`}
              required
            />
            <Field label="Confirm master passphrase" name="passphrase2" type="password" autoComplete="off" required />
            <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              We never see your master passphrase and cannot reset it. If you forget it, your data cannot be recovered.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <SubmitButton busy={busy}>{busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}</SubmitButton>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(registering ? 'login' : 'register')
          setError(null)
          setBusy(false)
        }}
        className="mt-4 w-full text-center text-sm text-sky-700 hover:underline dark:text-sky-400"
      >
        {registering ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </AuthLayout>
  )
}
