import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createKeyCheck, deriveKey, generateSalt, verifyKeyCheck } from '../../crypto'
import { authApi } from './api'
import { SessionContext, WrongPassphraseError, type SessionApi, type SessionState } from './sessionContext'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    authApi
      .me()
      .then((user) => !cancelled && setState(user ? { status: 'locked', user } : { status: 'signedOut' }))
      .catch(() => !cancelled && setState({ status: 'signedOut' }))
    return () => {
      cancelled = true
    }
  }, [])

  const register = useCallback<SessionApi['register']>(async (email, password, passphrase) => {
    const kdfSalt = generateSalt()
    const key = await deriveKey(passphrase, kdfSalt)
    const user = await authApi.register({ email, password, kdfSalt, keyCheck: await createKeyCheck(key) })
    setState({ status: 'unlocked', user, key })
  }, [])

  const login = useCallback<SessionApi['login']>(async (email, password) => {
    setState({ status: 'locked', user: await authApi.login({ email, password }) })
  }, [])

  const unlock = useCallback<SessionApi['unlock']>(
    async (passphrase) => {
      if (state.status !== 'locked') return
      const key = await deriveKey(passphrase, state.user.kdfSalt)
      if (!(await verifyKeyCheck(key, state.user.keyCheck))) throw new WrongPassphraseError()
      setState({ status: 'unlocked', user: state.user, key })
    },
    [state],
  )

  const lock = useCallback(() => {
    setState((s) => (s.status === 'unlocked' ? { status: 'locked', user: s.user } : s))
  }, [])

  const logout = useCallback(async () => {
    // Drop the key first so it is gone even if the network call fails.
    setState({ status: 'signedOut' })
    await authApi.logout().catch(() => undefined)
  }, [])

  const api = useMemo<SessionApi>(
    () => ({ state, register, login, unlock, lock, logout }),
    [state, register, login, unlock, lock, logout],
  )
  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>
}
