import { describe, expect, it } from 'vitest'
import { BreachCheckError, breachCount } from './hibp'

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const PREFIX = '5BAA6'
const SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8'

interface Recorded {
  url: string
  init?: RequestInit
}

function fakeFetch(body: string, status = 200): { fetchImpl: typeof fetch; calls: Recorded[] } {
  const calls: Recorded[] = []
  const fetchImpl: typeof fetch = (input, init) => {
    calls.push({ url: String(input), init })
    return Promise.resolve(new Response(body, { status }))
  }
  return { fetchImpl, calls }
}

describe('breachCount', () => {
  it('sends only the 5-character hash prefix', async () => {
    const { fetchImpl, calls } = fakeFetch('')
    await breachCount('password', fetchImpl)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(`https://api.pwnedpasswords.com/range/${PREFIX}`)
    const { pathname, search } = new URL(calls[0]?.url ?? '')
    expect(pathname).toBe(`/range/${PREFIX}`)
    expect(search).toBe('')
    expect(JSON.stringify(calls)).not.toContain(SUFFIX)
    expect(JSON.stringify(calls[0]?.init)).not.toMatch(/password/i)
  })

  it('asks for padding and sends no credentials or referrer', async () => {
    const { fetchImpl, calls } = fakeFetch('')
    await breachCount('password', fetchImpl)
    expect(calls[0]?.init?.headers).toEqual({ 'Add-Padding': 'true' })
    expect(calls[0]?.init?.credentials).toBe('omit')
    expect(calls[0]?.init?.referrerPolicy).toBe('no-referrer')
  })

  it('returns the count when the suffix is listed', async () => {
    const { fetchImpl } = fakeFetch(`0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n${SUFFIX}:10437277\r\nFFFF:1`)
    expect(await breachCount('password', fetchImpl)).toBe(10437277)
  })

  it('returns 0 when the suffix is absent', async () => {
    const { fetchImpl } = fakeFetch('0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n011053FD0102E94D6AE2F8B83D76FAF94F6:1')
    expect(await breachCount('password', fetchImpl)).toBe(0)
  })

  it('treats padding rows (count 0) as not breached', async () => {
    const { fetchImpl } = fakeFetch(`${SUFFIX}:0`)
    expect(await breachCount('password', fetchImpl)).toBe(0)
  })

  it('does not match a suffix that merely starts the same', async () => {
    const { fetchImpl } = fakeFetch(`${SUFFIX.slice(0, 20)}:99`)
    expect(await breachCount('password', fetchImpl)).toBe(0)
  })

  it('throws a BreachCheckError on HTTP errors and network failures', async () => {
    await expect(breachCount('password', fakeFetch('', 503).fetchImpl)).rejects.toBeInstanceOf(BreachCheckError)
    const offline: typeof fetch = () => Promise.reject(new TypeError('Failed to fetch'))
    await expect(breachCount('password', offline)).rejects.toBeInstanceOf(BreachCheckError)
  })
})
