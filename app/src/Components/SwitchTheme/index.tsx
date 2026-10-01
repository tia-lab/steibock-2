'use client'

import { config } from '$/config'
import { useCursorInteraction } from '@/hooks'
import { useThemeStore } from '@/store'
import { useStore } from 'zustand'
import $ from './style.module.scss'

export const SwitchTheme = () => {
	const switchTheme = useStore(useThemeStore, (state) => state.switchTheme)
	const cursorHandlers = useCursorInteraction<HTMLButtonElement>({
		variant: 'hover'
	})

	return config.theme.enabled ? (
		<button
			className={$.button}
			onClick={switchTheme}
			{...cursorHandlers}
			aria-label='Switch Theme'
		/>
	) : null
}
