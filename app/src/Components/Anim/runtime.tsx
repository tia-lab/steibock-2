'use client'

import { config } from '$/config'
import {
	elementAnimations,
	type ElementAnimationMediaOverrides,
	type ElementAnimationName
} from '@/animations/elements'
import { gsap } from '@/gsap'
import { useGsapMatchMedia } from '@/hooks'
import type { ScrollTrigger } from '@/gsap'

type AnimRuntimeProps = {
	targetId: string
	type?: ElementAnimationName
	fromVars?: gsap.TweenVars
	vars?: gsap.TweenVars
	scrollTrigger?: ScrollTrigger.Vars
	media?: ElementAnimationMediaOverrides
}

export const AnimRuntime = ({
	targetId,
	type,
	fromVars,
	vars,
	scrollTrigger,
	media
}: AnimRuntimeProps) => {
	useGsapMatchMedia(
		config.context,
		(context) => {
			const element = document.getElementById(targetId)

			if (!type || !element) {
				return
			}

			const animation = elementAnimations[type]

			if (!animation) {
				return
			}

			animation({
				element,
				context,
				conditions: context.conditions ?? {},
				fromVars,
				vars,
				scrollTrigger,
				media
			})
		},
		{
			scope: `#${targetId}`,
			dependencies: [targetId, type, fromVars, vars, scrollTrigger, media]
		}
	)

	return null
}
