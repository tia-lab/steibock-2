import { fade } from './fade'
import { fadeUp } from './fade-up'

export const elementAnimations = {
	fade,
	'fade-up': fadeUp
} as const

export type ElementAnimationName = keyof typeof elementAnimations
