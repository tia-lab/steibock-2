import { describe, expect, test } from 'bun:test'
import { matchesCategory } from './filter'

describe('matchesCategory', () => {
	test('shows everything for All and only matching categories otherwise', () => {
		expect(matchesCategory(['a'], null)).toBe(true)
		expect(matchesCategory(['a', 'b'], 'b')).toBe(true)
		expect(matchesCategory(['a'], 'b')).toBe(false)
	})
})
