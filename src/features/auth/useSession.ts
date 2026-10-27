import { useContext } from 'react'
import { SessionContext, type SessionApi } from './sessionContext'

export function useSession(): SessionApi {
  const api = useContext(SessionContext)
  if (!api) throw new Error('useSession must be used inside SessionProvider')
  return api
}
