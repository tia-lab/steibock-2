import { useEffect, useEffectEvent } from 'react'

type KeyboardTarget = Document | HTMLElement | Window | null

export type UseKeypressCallback = (event: KeyboardEvent) => void

export interface UseKeypressOptions {
	enabled?: boolean
	event?: 'keydown' | 'keyup'
	target?: KeyboardTarget
	preventDefault?: boolean
	stopPropagation?: boolean
}

const KEY_ALIASES: Record<string, string> = {
	enter: 'Enter',
	esc: 'Escape',
	escape: 'Escape',
	return: 'Enter',
	space: ' ',
	spacebar: ' '
}

function normalizeKey(key: string): string {
	const lowered = key.trim().toLowerCase()
	return KEY_ALIASES[lowered] ?? key
}

export function useKeypress(
	keys: string | string[],
	callback: UseKeypressCallback,
	options: UseKeypressOptions = {}
) {
	const onKeypress = useEffectEvent(callback)

	useEffect(() => {
		if (options.enabled === false) return
		if (typeof window === 'undefined') return

		const target = options.target ?? window
		if (!target || !('addEventListener' in target)) return

		const normalizedKeys = new Set(
			(Array.isArray(keys) ? keys : [keys]).map((key) => normalizeKey(key))
		)
		const eventName = options.event ?? 'keydown'

		const handleKeypress = (event: KeyboardEvent) => {
			if (!normalizedKeys.has(normalizeKey(event.key))) return

			if (options.preventDefault) {
				event.preventDefault()
			}

			if (options.stopPropagation) {
				event.stopPropagation()
			}

			onKeypress(event)
		}

		target.addEventListener(eventName, handleKeypress as EventListener)

		return () => {
			target.removeEventListener(eventName, handleKeypress as EventListener)
		}
	}, [
		keys,
		options.enabled,
		options.event,
		options.preventDefault,
		options.stopPropagation,
		options.target
	])
}
