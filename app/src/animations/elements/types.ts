import { config } from '$/config'
import type { gsap, ScrollTrigger } from '@/gsap'

export type AnimationMediaKey = keyof typeof config.context

export type ElementAnimationOverrides = {
	fromVars?: gsap.TweenVars
	vars?: gsap.TweenVars
	scrollTrigger?: ScrollTrigger.Vars
}

export type ElementAnimationMediaOverrides = Partial<
	Record<AnimationMediaKey, ElementAnimationOverrides>
>

export type ElementAnimationContext = ElementAnimationOverrides & {
	element: HTMLElement
	context: gsap.Context
	conditions: Partial<Record<AnimationMediaKey, boolean>>
	media?: ElementAnimationMediaOverrides
}

export type ElementAnimation = (
	context: ElementAnimationContext
) => gsap.core.Tween | gsap.core.Timeline | ScrollTrigger | void
