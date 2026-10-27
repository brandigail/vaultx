import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, MAX_LENGTH, characterClasses, generatePassword, randomInt, type GeneratorOptions } from './generate'
import { estimateStrength } from './strength'

const only = (overrides: Partial<GeneratorOptions>): GeneratorOptions => ({
  ...DEFAULT_OPTIONS,
  lower: false,
  upper: false,
  digits: false,
  symbols: false,
  ...overrides,
})

describe('randomInt', () => {
  it('stays within range and covers every value', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const n = randomInt(6)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(6)
      seen.add(n)
    }
    expect(seen.size).toBe(6)
  })

  it('is roughly uniform', () => {
    const counts = new Array<number>(10).fill(0)
    for (let i = 0; i < 20000; i++) {
      const n = randomInt(10)
      counts[n] = (counts[n] ?? 0) + 1
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(1700)
      expect(count).toBeLessThan(2300)
    }
  })

  it('rejects invalid bounds', () => {
    expect(() => randomInt(0)).toThrow(RangeError)
    expect(() => randomInt(1.5)).toThrow(RangeError)
  })
})

describe('generatePassword', () => {
  it('honours the requested length', () => {
    for (const length of [8, 20, MAX_LENGTH]) {
      expect(generatePassword({ ...DEFAULT_OPTIONS, length })).toHaveLength(length)
    }
  })

  it('includes every selected class, every time', () => {
    for (let i = 0; i < 300; i++) {
      const pw = generatePassword({ ...DEFAULT_OPTIONS, length: 8 })
      expect(pw).toMatch(/[a-z]/)
      expect(pw).toMatch(/[A-Z]/)
      expect(pw).toMatch(/[0-9]/)
      expect(pw).toMatch(/[^a-zA-Z0-9]/)
    }
  })

  it('uses only the selected classes', () => {
    for (let i = 0; i < 100; i++) {
      expect(generatePassword(only({ digits: true, length: 12 }))).toMatch(/^[0-9]{12}$/)
      expect(generatePassword(only({ lower: true, upper: true, length: 12 }))).toMatch(/^[a-zA-Z]{12}$/)
    }
  })

  it('leaves out ambiguous characters when asked', () => {
    for (let i = 0; i < 200; i++) {
      expect(generatePassword({ ...DEFAULT_OPTIONS, avoidAmbiguous: true, length: 40 })).not.toMatch(/[O0oIl1|]/)
    }
    expect(characterClasses({ ...DEFAULT_OPTIONS, avoidAmbiguous: true }).join('')).not.toMatch(/[O0oIl1|]/)
  })

  it('does not repeat itself', () => {
    const set = new Set(Array.from({ length: 200 }, () => generatePassword(DEFAULT_OPTIONS)))
    expect(set.size).toBe(200)
  })

  it('does not always start with the guaranteed lowercase character', () => {
    const firsts = new Set(Array.from({ length: 200 }, () => /^[a-z]/.test(generatePassword(DEFAULT_OPTIONS))))
    expect(firsts.size).toBe(2)
  })

  it('refuses impossible requests', () => {
    expect(() => generatePassword(only({}))).toThrow(RangeError)
    expect(() => generatePassword({ ...DEFAULT_OPTIONS, length: 2 })).toThrow(RangeError)
    expect(() => generatePassword({ ...DEFAULT_OPTIONS, length: MAX_LENGTH + 1 })).toThrow(RangeError)
  })
})

describe('estimateStrength', () => {
  it('scores an empty password as zero', () => {
    expect(estimateStrength('')).toEqual({ bits: 0, level: 0, label: 'Very weak' })
  })

  it('caps common passwords whatever their length or classes', () => {
    expect(estimateStrength('password').level).toBe(0)
    expect(estimateStrength('Password1').level).toBe(0)
    expect(estimateStrength('1234567890').level).toBe(0)
  })

  it('discounts repeats and sequences', () => {
    expect(estimateStrength('aaaaaaaaaaaa').bits).toBeLessThan(estimateStrength('qzjxkvmwpbtd').bits)
    expect(estimateStrength('abcdefghijkl').bits).toBeLessThan(estimateStrength('qzjxkvmwpbtd').bits)
  })

  it('rises with length and variety', () => {
    expect(estimateStrength('Tr0ub&3').bits).toBeLessThan(estimateStrength('Tr0ub&3xQp9!').bits)
    expect(estimateStrength('qzjxkvmwpbtd').bits).toBeLessThan(estimateStrength('Qzjxkvmwpbtd').bits)
  })

  it('maps bits to levels at the thresholds', () => {
    expect(estimateStrength('qzjxkv').level).toBe(1)
    expect(estimateStrength('qzjxkvmwpbtd').level).toBe(2)
    expect(estimateStrength('Qzjxkvmwpbtd7!Lr').level).toBe(4)
  })

  it('rates generated default passwords as very strong', () => {
    for (let i = 0; i < 50; i++) expect(estimateStrength(generatePassword(DEFAULT_OPTIONS)).level).toBe(4)
  })
})
