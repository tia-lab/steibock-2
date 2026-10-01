import { gsap } from '@/gsap'
import { type DependencyList } from 'react'
import { type GsapScope } from './use-gsap'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

type MatchMediaQuery = string
type MatchMediaConditions = Record<string, string>
type MatchMediaInput = MatchMediaQuery | MatchMediaConditions
type MatchMediaCleanup = () => void
type MatchMediaContextSafe = <T extends (...args: never[]) => unknown>(
	func: T
) => T

type MatchMediaCallback = (
	context: gsap.Context,
	contextSafe?: MatchMediaContextSafe
) => MatchMediaCleanup | unknown | void

interface UseGsapMatchMediaOptions {
	scope?: GsapScope
	dependencies?: DependencyList
}

const emptyArray: DependencyList = []

export function useGsapMatchMedia(
	conditions: MatchMediaInput,
	callback: MatchMediaCallback,
	options: UseGsapMatchMediaOptions = {}
) {
	const { scope, dependencies = emptyArray } = options

	useIsomorphicLayoutEffect(() => {
		const mm = gsap.matchMedia(scope)

		mm.add(conditions, callback as unknown as gsap.ContextFunc)

		return () => mm.revert()
	}, dependencies)
}

export type {
	MatchMediaCallback,
	MatchMediaConditions,
	MatchMediaContextSafe,
	MatchMediaCleanup,
	MatchMediaInput,
	MatchMediaQuery,
	UseGsapMatchMediaOptions
}
