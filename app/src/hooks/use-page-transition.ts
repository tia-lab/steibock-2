'use client'

import {
	createPageTransitionContext,
	getPageTransition,
	isCurrentPageTransition,
	runPageTransitionPhase,
	startPageTransitionRuntime,
	type PageTransitionName
} from '@/animations/transitions'
import { usePageLifecycleStore } from '@/store'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback } from 'react'

export type NavigateOptions = {
	replace?: boolean
	transition?: PageTransitionName
}

export type UsePageTransitionReturn = {
	navigate: (href: string, options?: NavigateOptions) => number | null
}

const getTargetPathname = (href: string) => {
	try {
		return new URL(href, window.location.origin).pathname
	} catch {
		return href.split(/[?#]/)[0] || href
	}
}

export const usePageTransition = (): UsePageTransitionReturn => {
	const pathname = usePathname()
	const router = useRouter()

	const navigate = useCallback(
		(href: string, options: NavigateOptions = {}) => {
			const isExternal = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(href)

			if (isExternal || href.startsWith('#')) {
				window.location.href = href
				return null
			}

			if (href === pathname) {
				return null
			}

			const to = getTargetPathname(href)

			if (to === pathname) {
				return null
			}

			const lifecycle = usePageLifecycleStore.getState()
			const id = lifecycle.start({
				from: pathname,
				to,
				transition: options.transition
			})
			const { controller } = startPageTransitionRuntime(id)
			const transition = getPageTransition(options.transition)
			const context = createPageTransitionContext({
				id,
				from: pathname,
				to,
				signal: controller.signal,
				transition
			})

			void (async () => {
				try {
					await runPageTransitionPhase(transition, 'leave', context)

					if (!isCurrentPageTransition(id, controller.signal)) {
						return
					}

					const currentLifecycle = usePageLifecycleStore.getState()
					currentLifecycle.markNavigating(id)

					if (options.replace) {
						router.replace(href)
					} else {
						router.push(href)
					}
				} catch (error) {
					if (controller.signal.aborted) {
						return
					}

					console.error('[page transition] leave failed', error)
					usePageLifecycleStore.getState().cancel()
				}
			})()

			return id
		},
		[pathname, router]
	)

	return { navigate }
}
