'use client'

import { config } from '$/config'
import { gsap, Observer } from '@/gsap'
import { useGSAP } from '@/hooks'

const HIDE_THRESHOLD = 500
const SHOW_THRESHOLD = 36

export const HeaderHideOnScroll = () => {
	useGSAP(() => {
		gsap.registerPlugin(Observer)

		const header = document.querySelector<HTMLElement>('[data-header]')

		if (!header) {
			return
		}

		let hidden = false
		let lastScrollY = window.scrollY || document.documentElement.scrollTop || 0
		let directionAnchorY = lastScrollY
		let direction: 'up' | 'down' | null = null

		const showHeader = () => {
			gsap.to(header, {
				yPercent: 0,
				duration: config.animation.short,
				ease: config.animation.ease.out,
				overwrite: true
			})
		}

		const hideHeader = () => {
			gsap.to(header, {
				yPercent: -100,
				duration: config.animation.short,
				ease: config.animation.ease.out,
				overwrite: true
			})
		}

		gsap.set(header, { yPercent: 0 })

		const observer = Observer.create({
			target: window,
			type: 'wheel,touch,scroll',
			tolerance: 0,
			onChangeY: () => {
				const scrollY = window.scrollY || document.documentElement.scrollTop || 0

				if (scrollY <= 0) {
					hidden = false
					direction = null
					directionAnchorY = 0
					lastScrollY = 0
					showHeader()
					return
				}

				if (scrollY > lastScrollY) {
					if (direction !== 'down') {
						direction = 'down'
						directionAnchorY = scrollY
					}

					if (!hidden && scrollY - directionAnchorY >= HIDE_THRESHOLD) {
						hidden = true
						hideHeader()
					}
				} else if (scrollY < lastScrollY) {
					if (direction !== 'up') {
						direction = 'up'
						directionAnchorY = scrollY
					}

					if (hidden && directionAnchorY - scrollY >= SHOW_THRESHOLD) {
						hidden = false
						showHeader()
					}
				}

				lastScrollY = scrollY
			}
		})

		return () => observer.kill()
	}, [])

	return null
}
