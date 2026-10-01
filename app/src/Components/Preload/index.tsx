'use client'

import { config } from '$/config'
import { gsap } from '@/gsap'
import { useGSAP } from '@/hooks'
import { usePreloadStore } from '@/store'
import { useRef } from 'react'
import $ from './style.module.scss'

export const Preload = () => {
	const ref = useRef<HTMLDivElement | null>(null)
	const timelineRef = useRef<gsap.core.Timeline | null>(null)
	const status = usePreloadStore((state) => state.status)
	const hasCompleted = usePreloadStore((state) => state.hasCompleted)
	const start = usePreloadStore((state) => state.start)
	const complete = usePreloadStore((state) => state.complete)

	useGSAP(
		() => {
			if (!config.preload.enabled || hasCompleted || !ref.current) {
				return
			}

			const preload = ref.current

			timelineRef.current?.kill()
			start()

			timelineRef.current = gsap.timeline({
				defaults: {
					duration: config.animation.long,
					ease: config.animation.ease.out
				},
				onComplete: () => {
					complete()
					timelineRef.current = null
				}
			})

			timelineRef.current
				.set(preload, {
					autoAlpha: 1,
					pointerEvents: 'auto'
				})
				.to(preload, {
					autoAlpha: 0,
					pointerEvents: 'none'
				})

			return () => {
				timelineRef.current?.kill()
				timelineRef.current = null
			}
		},
		{ scope: ref, dependencies: [complete, hasCompleted, start] }
	)

	if (!config.preload.enabled || hasCompleted) {
		return null
	}

	return (
		<div
			ref={ref}
			className={$.preload}
			data-status={status}
			aria-hidden='true'
		/>
	)
}
