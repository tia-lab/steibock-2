import { StateTheme } from '@/store/theme'
import { LenisOptions } from 'lenis'
import { vars } from './src/styles/vars.generated'

export const config = {
	animation: {
		default: vars.durations.default,
		long: vars.durations.long,
		short: vars.durations.short,
		ease: {
			out: "'power2.out'",
			in: "'power2.in'",
			inOut: "'power2.inOut'"
		}
	},
	breakpoints: vars.breakpoints,
	colors: vars.colors,
	context: {
		isDesktop: `(width >= ${vars.breakpoints.mobile})`,
		isMobile: `(width < ${vars.breakpoints.mobile})`,
		reduceMotion: '(prefers-reduced-motion: reduce)'
	},
	cookies: {
		enabled: true
	},
	cursor: {
		enabled: true
	},
	lenis: {} as LenisOptions,
	space: vars.space,
	preload: {
		enabled: true
	},
	theme: {
		enabled: true,
		default: 'dark' as StateTheme['theme']
	}
}
