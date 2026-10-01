'use client'

import { config } from '$/config'
import { gsap, Observer } from '@/gsap'
import { useGSAP, useThemeColors } from '@/hooks'
import { useCursorStore, type CursorVariant } from '@/store'
import { useRef } from 'react'
import $ from './style.module.scss'

const cursorOffset = {
	x: 25,
	y: 25
}

const cursorLag = 0.32

export const Cursor = () => {
	const cursorRef = useRef<HTMLDivElement | null>(null)
	const hasPointerPosition = useRef(false)
	const variant = useCursorStore((state) => state.variant)
	const label = useCursorStore((state) => state.label)
	const { theme, colors } = useThemeColors()

	useGSAP(() => {
		if (!config.cursor.enabled || !cursorRef.current) {
			return
		}

		gsap.registerPlugin(Observer)

		const cursor = cursorRef.current
		const reducedMotionQuery = window.matchMedia(config.context.reduceMotion)
		const quickX = gsap.quickTo(cursor, 'x', {
			duration: cursorLag,
			ease: config.animation.ease.out
		})
		const quickY = gsap.quickTo(cursor, 'y', {
			duration: cursorLag,
			ease: config.animation.ease.out
		})

		gsap.set(cursor, {
			autoAlpha: 0,
			xPercent: -50,
			yPercent: -50
		})

		const hideCursor = () => {
			hasPointerPosition.current = false
			useCursorStore.getState().reset()
			gsap.set(cursor, { autoAlpha: 0 })
		}

		const setPosition = (x: number, y: number) => {
			if (reducedMotionQuery.matches) {
				gsap.set(cursor, { x, y })
				return
			}

			quickX(x)
			quickY(y)
		}

		const handlePointerMove = (event: Event) => {
			const pointerEvent = event as PointerEvent

			setPosition(
				pointerEvent.clientX + cursorOffset.x,
				pointerEvent.clientY + cursorOffset.y
			)

			if (!hasPointerPosition.current) {
				hasPointerPosition.current = true
				gsap.set(cursor, {
					autoAlpha: useCursorStore.getState().variant === 'hidden' ? 0 : 1
				})
			}
		}

		const observer = Observer.create({
			target: document.documentElement,
			type: 'pointer',
			onMove: (self) => handlePointerMove(self.event),
			onHover: (self) => handlePointerMove(self.event),
			onHoverEnd: hideCursor,
			onRelease: () => {
				if (useCursorStore.getState().variant === 'active') {
					useCursorStore.getState().reset()
				}
			}
		})

		return () => {
			observer.kill()
			gsap.killTweensOf(cursor)
		}
	}, [])

	useGSAP(
		() => {
			if (!config.cursor.enabled || !cursorRef.current) {
				return
			}

			const cursor = cursorRef.current
			const variantVars: Record<CursorVariant, gsap.TweenVars> = {
				default: {
					autoAlpha: 1,
					width: '1rem',
					height: '1rem',
					backgroundColor: colors.accent
				},
				hover: {
					autoAlpha: 1,
					width: '2.5rem',
					height: '2.5rem',
					backgroundColor: colors.accentW60
				},
				active: {
					autoAlpha: 1,
					width: '1.75rem',
					height: '1.75rem',
					backgroundColor: colors.accent
				},
				hidden: {
					autoAlpha: 0,
					width: '1rem',
					height: '1rem',
					backgroundColor: colors.accent
				}
			}
			const vars = {
				...variantVars[variant],
				autoAlpha: hasPointerPosition.current ? variantVars[variant].autoAlpha : 0
			}

			if (window.matchMedia(config.context.reduceMotion).matches) {
				gsap.set(cursor, vars)
				return
			}

			gsap.to(cursor, {
				...vars,
				duration: config.animation.short,
				ease: 'power2.out'
			})
		},
		{ dependencies: [colors, theme, variant] }
	)

	if (!config.cursor.enabled) {
		return null
	}

	return (
		<div
			ref={cursorRef}
			className={$.cursor}
			data-variant={variant}
			aria-hidden='true'>
			{label ? <span className={$.label}>{label}</span> : null}
		</div>
	)
}
