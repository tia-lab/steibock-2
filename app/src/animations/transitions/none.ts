import type { PageTransition } from './types'

export const noneTransition: PageTransition = {
	leave: () => undefined,
	enter: () => undefined
}
