import {
  generateKeyBetween,
  generateNKeysBetween,
} from 'fractional-indexing'

/**
 * Generate N evenly-spaced fractional index keys starting from scratch.
 * Returns an empty array when count <= 0.
 */
export function generateInitialKeys(count: number): string[] {
  if (count <= 0) return []
  return generateNKeysBetween(null, null, count)
}

/**
 * Generate a fractional index key between two existing keys.
 * Pass null for before/after to indicate "before the first" / "after the last".
 */
export function keyBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after)
}

/**
 * Validity check: must be a non-empty string containing only fractional-indexing
 * characters (base62: digits and ASCII letters).
 */
export function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && /^[0-9A-Za-z]+$/.test(key)
}
