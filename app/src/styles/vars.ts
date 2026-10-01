import {
	createResponsive,
	createThemed,
	createUtility,
	defineBreakpoints,
	defineThemes,
	expandColorTokenNames,
	hex,
	px,
	rem,
	styleValue
} from '../lib/styles'

export const breakpoints = defineBreakpoints({
	mobile: px(768)
})

const responsiveBase = 'desktop'

const responsive = createResponsive(breakpoints, responsiveBase)

export const themes = defineThemes({
	light: {
		default: true
	},
	dark: {}
})

const themed = createThemed(themes, 'light', {
	alpha: true,
	palette: true
})

const space = {
	global: responsive({
		desktop: rem(4),
		mobile: rem(1.25)
	}),
	'2xs': responsive({
		desktop: rem(0.5),
		mobile: rem(0.375)
	}),
	xs: responsive({
		desktop: rem(1),
		mobile: rem(0.75)
	}),
	sm: responsive({
		desktop: rem(2),
		mobile: rem(1.5)
	}),
	md: responsive({
		desktop: rem(4),
		mobile: rem(3)
	}),
	lg: responsive({
		desktop: rem(5),
		mobile: rem(3.75)
	}),
	xl: responsive({
		desktop: rem(8),
		mobile: rem(6)
	}),
	'2xl': responsive({
		desktop: rem(10),
		mobile: rem(7.5)
	}),
	section0: responsive({
		desktop: rem(0),
		mobile: rem(0)
	}),

	section1: responsive({
		desktop: rem(2),
		mobile: rem(1)
	}),

	section2: responsive({
		desktop: rem(5),
		mobile: rem(3)
	}),

	section3: responsive({
		desktop: rem(10),
		mobile: rem(5)
	})
} as const

const colors = {
	primary: themed({
		light: hex('#f7f7f2'),
		dark: hex('#080f11')
	}),
	secondary: themed({
		light: hex('#080f11'),
		dark: hex('#f7f7f2')
	}),
	accent: themed({
		light: hex('#bc4749'),
		dark: hex('#48d597')
	}),
	grey: themed({
		light: hex('#999999'),
		dark: hex('#999999')
	}),
	stroke: themed({
		light: hex('#080f11'),
		dark: hex('#f4f0e1')
	}),
	white: themed({
		light: hex('#f7f7f2'),
		dark: hex('#f7f7f2')
	}),
	black: themed({
		light: hex('#080f11'),
		dark: hex('#080f11')
	}),
	success: themed({
		light: hex('#48d597'),
		dark: hex('#48d597')
	}),
	error: themed({
		light: hex('#bc4749'),
		dark: hex('#bc4749')
	})
} as const

const colorUtilityTokens = Object.fromEntries(
	expandColorTokenNames(colors).map((name) => [name, true])
)

export const phi = 0.61803398875

const durations = {
	short: styleValue(0.5 * phi, 's'),
	default: styleValue(phi, 's'),
	long: styleValue(1.5 * phi, 's')
} as const

const easings = {
	in: styleValue('cubic-bezier(0.55, 0.085, 0.68, 0.53)'),
	out: styleValue('cubic-bezier(0.215, 0.61, 0.355, 1)'),
	inOut: styleValue('cubic-bezier(0.645, 0.045, 0.355, 1)')
} as const

const page = {
	base: styleValue(16),
	maxWidth: px(1800),
	paddingGlobal: space.global
} as const

const container = {
	maxWidth: styleValue('false'),
	columns: responsive({
		desktop: styleValue(12),
		mobile: styleValue(12)
	}),
	gap: responsive({
		desktop: rem(0),
		mobile: rem(0)
	})
} as const

export const styleVars = {
	breakpoints,
	responsiveBase,
	themes,
	space,
	colors,
	durations,
	easings,
	page,
	container,
	utilities: [
		createUtility(
			space,
			[
				{ prefix: 'm', properties: ['margin'] },
				{ prefix: 'mt', properties: ['marginTop'] },
				{ prefix: 'mr', properties: ['marginRight'] },
				{ prefix: 'mb', properties: ['marginBottom'] },
				{ prefix: 'ml', properties: ['marginLeft'] },
				{ prefix: 'mx', properties: ['marginLeft', 'marginRight'] },
				{ prefix: 'my', properties: ['marginTop', 'marginBottom'] },
				{ prefix: 'p', properties: ['padding'] },
				{ prefix: 'pt', properties: ['paddingTop'] },
				{ prefix: 'pr', properties: ['paddingRight'] },
				{ prefix: 'pb', properties: ['paddingBottom'] },
				{ prefix: 'pl', properties: ['paddingLeft'] },
				{ prefix: 'px', properties: ['paddingLeft', 'paddingRight'] },
				{ prefix: 'py', properties: ['paddingTop', 'paddingBottom'] },
				{ prefix: 'gap', properties: ['gap'] }
			],
			'space'
		),
		createUtility(
			colorUtilityTokens,
			[
				{ prefix: 'text', properties: ['color'] },
				{ prefix: 'bg', properties: ['backgroundColor'] },
				{ prefix: 'border', properties: ['borderColor'] }
			],
			'color'
		)
	]
} as const
