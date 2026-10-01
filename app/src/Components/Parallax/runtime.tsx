'use client'

import { config } from '$/config'
import type { ElementAnimationMediaOverrides } from '@/animations/elements'
import {
	resolveElementAnimationOverrides,
	toImmediateVars
} from '@/animations/elements/utils'
import { gsap, ScrollTrigger } from '@/gsap'
import { useGsapMatchMedia } from '@/hooks'

type ParallaxAxis = 'x' | 'y'

type ParallaxRuntimeProps = {
	targetId: string
	speed?: number
	axis?: ParallaxAxis
	fromVars?: gsap.TweenVars
	vars?: gsap.TweenVars
	scrollTrigger?: ScrollTrigger.Vars
	media?: ElementAnimationMediaOverrides
}

const createDefaultFromVars = (
	axis: ParallaxAxis,
	offset: number
): gsap.TweenVars =>
	axis === 'x' ? { xPercent: -offset } : { yPercent: -offset }

const createDefaultVars = (
	axis: ParallaxAxis,
	offset: number
): gsap.TweenVars =>
	axis === 'x' ? { xPercent: offset } : { yPercent: offset }

export const ParallaxRuntime = ({
	targetId,
	speed = 0.2,
	axis = 'y',
	fromVars,
	vars,
	scrollTrigger,
	media
}: ParallaxRuntimeProps) => {
	useGsapMatchMedia(
		config.context,
		(context) => {
			const element = document.getElementById(targetId)

			if (!element) {
				return
			}

			const offset = speed * 100
			const overrides = resolveElementAnimationOverrides({
				element,
				context,
				conditions: context.conditions ?? {},
				fromVars: {
					...createDefaultFromVars(axis, offset),
					...fromVars
				},
				vars: {
					...createDefaultVars(axis, offset),
					ease: 'none',
					...vars
				},
				scrollTrigger: {
					trigger: element,
					start: 'top bottom',
					end: 'bottom top',
					scrub: true,
					...scrollTrigger
				},
				media
			})

			if (context.conditions?.reduceMotion) {
				gsap.set(element, {
					...toImmediateVars(overrides.vars ?? {}),
					x: 0,
					y: 0,
					xPercent: 0,
					yPercent: 0,
					clearProps: 'transform'
				})
				return
			}

			gsap.registerPlugin(ScrollTrigger)
			gsap.set(element, overrides.fromVars ?? {})

			return gsap.to(element, {
				...(overrides.vars ?? {}),
				scrollTrigger: overrides.scrollTrigger
			})
		},
		{
			scope: `#${targetId}`,
			dependencies: [
				targetId,
				speed,
				axis,
				fromVars,
				vars,
				scrollTrigger,
				media
			]
		}
	)

	return null
}

export type { ParallaxAxis }
