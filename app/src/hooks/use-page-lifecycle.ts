'use client'

import {
	clearPageTransitionRuntime,
	createPageTransitionContext,
	getActivePageTransition,
	getPageTransition,
	isCurrentPageTransition,
	runPageTransitionPhase
} from '@/animations/transitions'
import { usePageLifecycleStore } from '@/store'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

type UsePageLifecycleOptions = {
	debug?: boolean
}

const getDebugState = () => {
	const {
		id,
		status,
		current,
		from,
		to,
		transition,
		startedAt,
		updatedAt
	} = usePageLifecycleStore.getState()

	return {
		id,
		status,
		current,
		from,
		to,
		transition,
		startedAt,
		updatedAt
	}
}

export const usePageLifecycle = ({ debug = false }: UsePageLifecycleOptions = {}) => {
	const pathname = usePathname()
	const previousPathname = useRef<string | null>(null)

	useEffect(() => {
		const previous = previousPathname.current
		const lifecycle = usePageLifecycleStore.getState()

		if (previous === pathname) {
			return
		}

		if (previous === null) {
			lifecycle.setCurrent(pathname)
			previousPathname.current = pathname
			return
		}

		if (lifecycle.status !== 'idle' && lifecycle.to === pathname) {
			const id = lifecycle.id
			const activeTransition = getActivePageTransition()
			const controller =
				activeTransition?.id === id
					? activeTransition.controller
					: new AbortController()

			lifecycle.markEntering(id)

			void (async () => {
				const enteringLifecycle = usePageLifecycleStore.getState()
				const transition = getPageTransition(enteringLifecycle.transition)
				const context = createPageTransitionContext({
					id,
					from: enteringLifecycle.from,
					to: pathname,
					signal: controller.signal,
					transition
				})

				try {
					await runPageTransitionPhase(transition, 'enter', context)

					if (!isCurrentPageTransition(id, controller.signal)) {
						return
					}

					usePageLifecycleStore.getState().complete(id)
					clearPageTransitionRuntime(id)
				} catch (error) {
					if (controller.signal.aborted) {
						return
					}

					console.error('[page transition] enter failed', error)
					usePageLifecycleStore.getState().complete(id)
					clearPageTransitionRuntime(id)
				}
			})()
		} else {
			lifecycle.setCurrent(pathname)
		}

		previousPathname.current = pathname
	}, [pathname])

	useEffect(() => {
		if (!debug) {
			return
		}

		console.log('[page lifecycle]', getDebugState())

		return usePageLifecycleStore.subscribe(() => {
			console.log('[page lifecycle]', getDebugState())
		})
	}, [debug])
}
