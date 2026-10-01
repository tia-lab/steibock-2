import { config } from '$/config'
import { createStore } from 'zustand'
import { persist } from 'zustand/middleware'

export type StateTheme = {
	theme: 'light' | 'dark'
}

type Action = {
	updateTheme: (theme: StateTheme['theme']) => void
	switchTheme: () => void
}

type Themetore = StateTheme & Action

// Create your store, which includes both state and (optionally) actions
export const useThemeStore = createStore<Themetore>()(
	persist(
		(set) => ({
			theme: config.theme.default,
			updateTheme: (theme) => set(() => ({ theme: theme })),
			switchTheme: () =>
				set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }))
		}),
		{ name: 'theme' }
	)
)
