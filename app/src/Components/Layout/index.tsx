'use client'

import { config } from '$/config'
import { gsap } from '@/gsap'
import { usePageLifecycle, useTheme } from '@/hooks'
import { useCursorStore, useThemeStore } from '@/store'
import { LenisRef, ReactLenis, useLenis } from 'lenis/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useStore } from 'zustand'
import { Cursor } from '../Cursor'
import { Modal } from '../Modal'
import { Preload } from '../Preload'
import { Sidebar } from '../Sidebar'
import { Wrapper } from '../Wrapper'

interface LayoutProps {
	wrapper?: boolean
	children: React.ReactNode
}

export const Layout = ({ wrapper = true, children }: LayoutProps) => {
	const lenisRef = useRef<LenisRef | null>(null)
	const theme = useStore(useThemeStore, (state) => state.theme)

	const pathname = usePathname()
	const lenis = useLenis()

	useTheme()
	usePageLifecycle({ debug: false })

	useEffect(() => {
		if (!config.theme.enabled) return

		document.body.dataset.theme = theme
	}, [theme])

	useEffect(() => {
		function update(time: number) {
			lenisRef.current?.lenis?.raf(time * 1000)
		}

		gsap.ticker.add(update)

		return () => gsap.ticker.remove(update)
	}, [])

	useEffect(() => {
		if (!lenis) return
		lenis.scrollTo(0, { immediate: true })
	}, [pathname, lenis])

	useEffect(() => {
		if (!config.cursor.enabled) return

		useCursorStore.getState().reset()
	}, [pathname])

	const lenisOptions = { ...config.lenis, autoRaf: false }

	return (
		<>
			{config.preload.enabled ? <Preload /> : null}
			<ReactLenis options={lenisOptions} root ref={lenisRef}>
				<div className='page-wrapper' data-page-transition-root>
					{wrapper ? <Wrapper>{children}</Wrapper> : children}
				</div>
				<Modal />
				<Sidebar />
			</ReactLenis>
			{config.cursor.enabled ? <Cursor /> : null}
		</>
	)
}
