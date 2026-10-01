import { config } from '$/config'
import { useThemeStore } from '@/store'
import { useStore } from 'zustand'

type ThemeName = keyof typeof config.colors.themes
type ThemeColors = (typeof config.colors.themes)[ThemeName]

export const useThemeColors = (): {
	theme: ThemeName
	colors: ThemeColors
} => {
	const theme = useStore(useThemeStore, (state) => state.theme)

	return {
		theme,
		colors: config.colors.themes[theme]
	}
}

export type { ThemeColors, ThemeName }
