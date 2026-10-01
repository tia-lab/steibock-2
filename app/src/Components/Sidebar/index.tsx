'use client'
import { config } from '$/config'
import { gsap } from '@/gsap'
import { useKeypress } from '@/hooks'
import { useSidebarStore } from '@/store'
import clsx from 'clsx'
import { useLenis } from 'lenis/react'
import { useEffect, useRef } from 'react'
import { useOnClickOutside } from 'usehooks-ts'
import { SidebarLeft } from './Left'
import { SidebarRight } from './Right'
import $ from './style.module.scss'

export const Sidebar = () => {
	const open = useSidebarStore((state) => state.open)
	const setOpen = useSidebarStore((state) => state.updateOpen)
	const type = useSidebarStore((state) => state.type)

	const lenis = useLenis()
	const ref = useRef<HTMLElement | null>(null)
	const panelref = useRef<HTMLDivElement | null>(null)
	const direction = type === 'left' ? -100 : 100

	const handleClickOutside = () => {
		// Your custom logic here
		setOpen(false)
	}

	useOnClickOutside(panelref as any, handleClickOutside)

	useEffect(() => {
		const sidebar = ref.current
		const panel = panelref.current
		if (!sidebar || !panel) return

		gsap.killTweensOf([sidebar, panel])

		if (open) {
			lenis?.stop()
			gsap.set(sidebar, { display: 'flex', opacity: 0 })
			gsap.set(panel, { xPercent: direction, opacity: 1 })
			gsap
				.timeline({
					defaults: {
						ease: config.animation.ease.out,
						duration: config.animation.default,
						overwrite: 'auto'
					}
				})
				.to(sidebar, { opacity: 1, duration: config.animation.default * 0.5 })
				.to(panel, { xPercent: 0 }, 0)
		} else {
			lenis?.start()
			gsap
				.timeline({
					defaults: {
						ease: config.animation.ease.out,
						duration: config.animation.default,
						overwrite: 'auto'
					},
					onComplete: () => {
						gsap.set(sidebar, { display: 'none' })
					}
				})
				.to(panel, { xPercent: direction })
				.to(sidebar, { opacity: 0, duration: config.animation.default * 0.5 }, 0)
		}
	}, [open, direction, lenis])

	useKeypress('Escape', () => {
		if (!open) return
		setOpen(false)
	})

	const panelClass = clsx({
		[$.left]: type === 'left',
		[$.right]: type === 'right'
	})
	return (
		<aside
			className={clsx($.sidebar, open && $.open)}
			ref={ref}
			data-lenis-prevent>
			<div
				className={clsx($.panel, panelClass)}
				data-el='panel'
				ref={panelref}
				data-lenis-prevent>
				<div className={clsx($.plus)} onClick={() => setOpen(false)} data-button>
					<div className={clsx($.line, $.is_1)} data-line-1 />
					<div className={clsx($.line, $.is_2)} data-line-2 />
				</div>
				<div className={$.panel_inner} data-el='panel-inner' data-lenis-prevent>
					{type === 'right' && <SidebarRight />}
					{type === 'left' && <SidebarLeft />}
				</div>
			</div>
		</aside>
	)
}
