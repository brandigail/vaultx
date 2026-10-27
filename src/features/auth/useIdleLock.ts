import { useEffect } from 'react'

export const IDLE_LOCK_MS = 5 * 60 * 1000

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const

/** Calls `onIdle` after `ms` without user activity, including when the tab sat hidden for that long. */
export function useIdleLock(onIdle: () => void, ms: number = IDLE_LOCK_MS): void {
  useEffect(() => {
    let lastActivity = Date.now()
    let timer = window.setTimeout(onIdle, ms)

    const reset = () => {
      lastActivity = Date.now()
      window.clearTimeout(timer)
      timer = window.setTimeout(onIdle, ms)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity >= ms) onIdle()
    }

    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, reset, { passive: true })
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, reset)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [onIdle, ms])
}
