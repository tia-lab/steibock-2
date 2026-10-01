import { config } from '$/config'
import { pageTransitions, type PageTransitionName } from './registry'
import type { PageTransition, PageTransitionContext } from './types'

type ActivePageTransition = {
	id: number
	controller: AbortController
}

type CreatePageTransitionContextInput = {
	id: number
	from: string | null
	to: string
	signal: AbortSignal
	transition: PageTransition
}

let activePageTransition: ActivePageTransition | null = null

export const startPageTransitionRuntime = (id: number) => {
	activePageTransition?.controller.abort()

	activePageTransition = {
		id,
		controller: new AbortController()
	}

	return activePageTransition
}

export const getActivePageTransition = () => activePageTransition

export const clearPageTransitionRuntime = (id: number) => {
	if (activePageTransition?.id === id) {
		activePageTransition = null
	}
}

export const getPageTransitionRoot = (transition?: PageTransition) => {
	if (typeof document === 'undefined') {
		return null
	}

	return document.querySelector<HTMLElement>(
		transition?.rootSelector ?? '[data-page-transition-root]'
	)
}

export const isReducedMotion = () => {
	if (typeof window === 'undefined') {
		return false
	}

	return window.matchMedia(config.context.reduceMotion).matches
}

export const getPageTransition = (
	name: PageTransitionName | null | undefined
): PageTransition => {
	return pageTransitions[name ?? 'none'] ?? pageTransitions.none
}

export const isCurrentPageTransition = (
	id: number,
	signal: AbortSignal
) => {
	return (
		!signal.aborted &&
		(!activePageTransition || activePageTransition.id === id)
	)
}

export const createPageTransitionContext = ({
	id,
	from,
	to,
	signal,
	transition
}: CreatePageTransitionContextInput): PageTransitionContext => {
	return {
		id,
		from,
		to,
		root: getPageTransitionRoot(transition),
		signal
	}
}

export const runPageTransitionPhase = async (
	transition: PageTransition,
	phase: 'leave' | 'enter',
	context: PageTransitionContext
) => {
	if (context.signal.aborted || isReducedMotion()) {
		return
	}

	await transition[phase]?.(context)
}
