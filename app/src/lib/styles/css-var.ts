import { vars } from '@/styles/vars.generated'

type ColorTokenName = Exclude<keyof typeof vars.colors, 'themes'>

const toKebabToken = (value: string) =>
	value
		.replace(/([a-zA-Z])(\d+)/g, '$1-$2')
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.toLowerCase()

export const cssVar = (name: string) => `var(--${toKebabToken(name)})`

export const colorVar = (name: ColorTokenName) => cssVar(`color-${name}`)

export type { ColorTokenName }
