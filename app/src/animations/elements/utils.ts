import { config } from '$/config'
import type { gsap, ScrollTrigger } from '@/gsap'
import type {
	AnimationMediaKey,
	ElementAnimationContext,
	ElementAnimationOverrides
} from './types'

type ImmediateVars = gsap.TweenVars & {
	scrollTrigger?: never
}

const timingKeys = new Set([
	'delay',
	'duration',
	'ease',
	'onComplete',
	'onInterrupt',
	'onStart',
	'onUpdate',
	'scrollTrigger',
	'stagger'
])

const mergeVars = <T extends gsap.TweenVars | ScrollTrigger.Vars>(
	base: T,
	override?: T
) => ({
	...base,
	...override
})

export const resolveElementAnimationOverrides = ({
	conditions,
	fromVars,
	vars,
	scrollTrigger,
	media
}: ElementAnimationContext): ElementAnimationOverrides => {
	const resolved: ElementAnimationOverrides = {
		fromVars: { ...fromVars },
		vars: { ...vars },
		scrollTrigger: { ...scrollTrigger }
	}

	for (const key of Object.keys(config.context) as AnimationMediaKey[]) {
		if (!conditions[key] || !media?.[key]) {
			continue
		}

		resolved.fromVars = mergeVars(
			resolved.fromVars ?? {},
			media[key]?.fromVars
		)
		resolved.vars = mergeVars(resolved.vars ?? {}, media[key]?.vars)
		resolved.scrollTrigger = mergeVars(
			resolved.scrollTrigger ?? {},
			media[key]?.scrollTrigger
		)
	}

	return resolved
}

export const createScrollTriggerVars = (
	element: HTMLElement,
	scrollTrigger?: ScrollTrigger.Vars
): ScrollTrigger.Vars => ({
	trigger: element,
	start: 'top 90%',
	once: true,
	...scrollTrigger
})

export const toImmediateVars = (vars: gsap.TweenVars): ImmediateVars => {
	const immediateVars: gsap.TweenVars = {}

	for (const [key, value] of Object.entries(vars)) {
		if (!timingKeys.has(key)) {
			immediateVars[key] = value
		}
	}

	return immediateVars as ImmediateVars
}
