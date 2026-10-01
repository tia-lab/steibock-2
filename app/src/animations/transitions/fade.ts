import { config } from '$/config'
import { gsap } from '@/gsap'
import type { PageTransition } from './types'

const fade = (root: HTMLElement, signal: AbortSignal, vars: gsap.TweenVars) => {
	return new Promise<void>((resolve) => {
		if (signal.aborted) {
			resolve()
			return
		}

		const finish = () => {
			signal.removeEventListener('abort', abort)
			resolve()
		}
		const abort = () => {
			tween.kill()
			finish()
		}
		const tween = gsap.to(root, {
			...vars,
			onComplete: finish,
			onInterrupt: finish
		})

		signal.addEventListener('abort', abort, { once: true })
	})
}

export const fadeTransition: PageTransition = {
	rootSelector: '[data-page-transition-content]',
	leave: async ({ root, signal }) => {
		if (!root || signal.aborted) {
			return
		}

		gsap.killTweensOf(root)

		await fade(root, signal, {
			autoAlpha: 0,
			duration: config.animation.short,
			ease: config.animation.ease.out
		})
	},
	enter: async ({ root, signal }) => {
		if (!root || signal.aborted) {
			return
		}

		gsap.killTweensOf(root)
		gsap.set(root, { autoAlpha: 0 })

		await fade(root, signal, {
			autoAlpha: 1,
			duration: config.animation.short,
			ease: config.animation.ease.out
		})
	}
}
