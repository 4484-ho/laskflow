import { describe, it, expect } from 'vitest'
import {
  generateInitialKeys,
  keyBetween,
  isValidKey,
} from '@/lib/fractional-index'

describe('fractional-index', () => {
  describe('generateInitialKeys', () => {
    it('returns N unique ascending string keys', () => {
      const keys = generateInitialKeys(5)
      expect(keys).toHaveLength(5)
      expect(new Set(keys).size).toBe(5)
      const sorted = [...keys].sort()
      expect(sorted).toEqual(keys)
    })

    it('handles count=0', () => {
      expect(generateInitialKeys(0)).toEqual([])
    })

    it('handles count=1', () => {
      const keys = generateInitialKeys(1)
      expect(keys).toHaveLength(1)
      expect(typeof keys[0]).toBe('string')
    })
  })

  describe('keyBetween', () => {
    it('returns a key between two given keys', () => {
      const [a, b] = generateInitialKeys(2)
      const mid = keyBetween(a, b)
      expect(mid > a).toBe(true)
      expect(mid < b).toBe(true)
    })

    it('returns a key after last when after=null', () => {
      const [k] = generateInitialKeys(1)
      const next = keyBetween(k, null)
      expect(next > k).toBe(true)
    })

    it('returns a key before first when before=null', () => {
      const [k] = generateInitialKeys(1)
      const prev = keyBetween(null, k)
      expect(prev < k).toBe(true)
    })

    it('returns a valid key when both null', () => {
      const k = keyBetween(null, null)
      expect(typeof k).toBe('string')
      expect(k.length).toBeGreaterThan(0)
    })
  })

  describe('isValidKey', () => {
    it('accepts generated keys', () => {
      const [k] = generateInitialKeys(1)
      expect(isValidKey(k)).toBe(true)
    })

    it('rejects empty string', () => {
      expect(isValidKey('')).toBe(false)
    })

    it('rejects null', () => {
      expect(isValidKey(null)).toBe(false)
    })

    it('rejects strings with special characters', () => {
      expect(isValidKey('a!b')).toBe(false)
      expect(isValidKey('a b')).toBe(false)
    })
  })
})
