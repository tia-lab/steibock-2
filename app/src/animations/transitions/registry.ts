import { fadeTransition } from './fade'
import { noneTransition } from './none'

export const pageTransitions = {
	none: noneTransition,
	fade: fadeTransition
} as const

export type PageTransitionName = keyof typeof pageTransitions
