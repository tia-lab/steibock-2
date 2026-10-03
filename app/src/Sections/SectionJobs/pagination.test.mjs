import { describe, expect, test } from 'bun:test'
import { pageItems } from './pagination'

describe('pageItems', () => {
	test('returns only the requested page', () => {
		expect(pageItems([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4])
	})
})
