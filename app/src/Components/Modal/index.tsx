'use client'
import { config } from '$/config'
import { gsap } from '@/gsap'
import { useGSAP, useKeypress } from '@/hooks'
import { useModalStore } from '@/store'
import clsx from 'clsx'
import { useLenis } from 'lenis/react'
import { useEffect, useRef } from 'react'
import { useOnClickOutside } from 'usehooks-ts'
import { ModalDefault } from './Default'
import { ModalFull } from './Full'
import $ from './style.module.scss'

export const Modal = () => {
	const open = useModalStore((state) => state.open)
	const setOpen = useModalStore((state) => state.updateOpen)
	const type = useModalStore((state) => state.type)

	const lenis = useLenis()
	const ref = useRef<HTMLElement | null>(null)
	const panelref = useRef<HTMLDivElement | null>(null)
	const tl = useRef<GSAPTimeline | null>(null)

	const handleClickOutside = () => {
		// Your custom logic here
		setOpen(false)
	}

	useOnClickOutside(panelref as any, handleClickOutside)

	useGSAP(
		() => {
			const panel = "[data-el='panel']"

			gsap.set(ref.current, {
				display: 'none'
			})

			gsap.set([panel, ref.current], {
				opacity: 0
			})

			tl.current = gsap
				.timeline({
					paused: true,
					defaults: {
						ease: config.animation.ease.out,
						duration: config.animation.default
					}
				})
				.to(ref.current, {
					display: 'flex',
					duration: 0
				})
				.to(
					[ref.current, panel],
					{
						opacity: 1,
						duration: config.animation.default * 0.5
					},
					0
				)
		},

		{ scope: ref }
	)

	useEffect(() => {
		if (!tl.current) return
		if (open) {
			lenis?.stop()
			tl.current.play()
		} else {
			lenis?.start()
			tl.current.reverse()
		}
	}, [open, lenis])

	useKeypress('Escape', () => {
		if (!open) return
		setOpen(false)
	})

	const layoutClass = clsx({
		[$.full]: type === 'full'
	})
	return (
		<aside
			className={clsx($.modal, open && $.open, layoutClass)}
			ref={ref}
			data-lenis-prevent>
			<div className={$.panel} data-el='panel' ref={panelref} data-lenis-prevent>
				<div className={clsx($.plus)} onClick={() => setOpen(false)} data-button>
					<div className={clsx($.line, $.is_1)} data-line-1 />
					<div className={clsx($.line, $.is_2)} data-line-2 />
				</div>
				<div className={$.panel_inner} data-el='panel-inner' data-lenis-prevent>
					{type === 'default' && <ModalDefault />}
					{type === 'full' && <ModalFull />}
				</div>
			</div>
		</aside>
	)
}
