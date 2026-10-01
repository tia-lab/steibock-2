import { config } from '$/config'
import { gsap } from '@/gsap'
import { useThemeStore } from '@/store'
import { useStore } from 'zustand'
import { useGSAP } from './use-gsap'

type ThemeName = keyof typeof config.colors.themes
type ThemeColors = (typeof config.colors.themes)[ThemeName]

const toKebabCase = (value: string) =>
	value
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/([a-zA-Z])(\d+)/g, '$1-$2')
		.toLowerCase()

const renderColorVars = (colors: ThemeColors) =>
	Object.fromEntries(
		Object.entries(colors).map(([key, value]) => [
			`--color-${toKebabCase(key)}`,
			value
		])
	)

export const useTheme = () => {
	const theme = useStore(useThemeStore, (state) => state.theme)

	useGSAP(
		() => {
			if (!config.theme.enabled) return
			const themeColors = config.colors.themes[theme]

			gsap.to(document.body, {
				...renderColorVars(themeColors),
				duration: config.animation.short,
				ease: config.animation.ease.out
			})
		},
		{ dependencies: [theme] }
	)
}

export type { ThemeColors, ThemeName }
