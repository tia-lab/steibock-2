import { gsap } from '@/gsap'
import { useRef, useState, type DependencyList, type RefObject } from 'react'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

type GsapCore = typeof gsap
type GsapScope = Element | RefObject<Element | null> | string
type GsapCallback = (
	context: gsap.Context,
	contextSafe?: ContextSafeFunc
) => unknown
type ContextSafeTarget = (...args: never[]) => unknown
type ContextSafeFunc = <T extends ContextSafeTarget>(func: T) => T

interface UseGsapConfig {
	scope?: GsapScope
	dependencies?: DependencyList
	revertOnUpdate?: boolean
}

interface UseGsapReturn {
	context: gsap.Context
	contextSafe: ContextSafeFunc
}

interface UseGsapHook {
	(
		callback?: GsapCallback | UseGsapConfig,
		dependencies?: DependencyList | UseGsapConfig
	): UseGsapReturn
	register(core: GsapCore): void
	headless: boolean
}

type ContextAddWithNull = <T extends ContextSafeTarget>(
	methodName: null,
	func: T
) => T

const emptyArray: DependencyList = []
const defaultConfig: UseGsapConfig = {}

let gsapCore = gsap

const isConfig = (value: unknown): value is UseGsapConfig =>
	Boolean(value) && !Array.isArray(value) && typeof value === 'object'

export const useGSAP: UseGsapHook = (
	callbackOrConfig,
	dependenciesOrConfig = emptyArray
) => {
	const callback: GsapCallback | null =
		typeof callbackOrConfig === 'function' ? callbackOrConfig : null
	let config = defaultConfig
	let dependencies = emptyArray

	if (isConfig(callbackOrConfig)) {
		config = callbackOrConfig
		dependencies = config.dependencies ?? emptyArray
	} else if (isConfig(dependenciesOrConfig)) {
		config = dependenciesOrConfig
		dependencies = config.dependencies ?? emptyArray
	} else {
		dependencies = dependenciesOrConfig
	}

	if (callbackOrConfig && !isConfig(callbackOrConfig) && !callback) {
		console.warn('First parameter must be a function or config object')
	}

	const { scope, revertOnUpdate } = config
	const mounted = useRef(false)
	const [context] = useState(() => gsapCore.context(() => {}, scope))
	const [contextSafe] = useState<ContextSafeFunc>(
		() =>
			((func) => {
				const add = context.add as unknown as ContextAddWithNull

				return add(null, func)
			}) as ContextSafeFunc
	)
	const deferCleanup = Boolean(dependencies.length && !revertOnUpdate)

	useIsomorphicLayoutEffect(() => {
		if (!deferCleanup) return

		mounted.current = true

		return () => context.revert()
	}, [deferCleanup])

	useIsomorphicLayoutEffect(() => {
		if (callback) {
			context.add(callback, scope)
		}

		if (!deferCleanup || !mounted.current) {
			return () => context.revert()
		}
	}, dependencies)

	return {
		context,
		contextSafe
	}
}

useGSAP.register = (core) => {
	gsapCore = core
}

useGSAP.headless = true

export type {
	ContextSafeFunc,
	GsapCallback,
	GsapScope,
	UseGsapConfig,
	UseGsapReturn
}
