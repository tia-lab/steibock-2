'use client'

import { config } from '$/config'
import { Button } from '@/Components/Button'
import { TransitionLink } from '@/Components/TransitionLink'
import { gsap } from '@/gsap'
import { useCursorInteraction, useGSAP } from '@/hooks'
import {
	isCookieConsentExpired,
	useCookieConsentStore
} from '@/store/cookie-consent'
import { useEffect, useRef, useState } from 'react'
import $ from './style.module.scss'

export type CookiesBannerLink = {
	id: string
	label: string
	href: string
	target: string
	isExternal: boolean
}

export type CookiesBannerData = {
	title?: string | null
	html?: string | null
	consentLabel?: string | null
	declineLabel?: string | null
	acceptLabel?: string | null
	retentionDays?: number | null
	links?: CookiesBannerLink[]
}

type CookiesBannerClientProps = {
	data: CookiesBannerData
}

export const CookiesBannerClient = ({ data }: CookiesBannerClientProps) => {
	const ref = useRef<HTMLElement | null>(null)
	const tl = useRef<gsap.core.Timeline | null>(null)
	const [hydrated, setHydrated] = useState(() =>
		useCookieConsentStore.persist.hasHydrated()
	)
	const status = useCookieConsentStore((state) => state.status)
	const expiresAt = useCookieConsentStore((state) => state.expiresAt)

	const accept = useCookieConsentStore((state) => state.accept)
	const decline = useCookieConsentStore((state) => state.decline)
	const reset = useCookieConsentStore((state) => state.reset)
	const linkCursorHandlers = useCursorInteraction<HTMLAnchorElement>({
		variant: 'hover'
	})

	const expired = isCookieConsentExpired(expiresAt)
	const pending = status === 'pending'
	const shouldShow = hydrated && pending

	useGSAP(
		() => {
			const banner = ref.current

			if (!banner) {
				return
			}

			gsap.set(banner, {
				autoAlpha: 0,
				y: 16,
				pointerEvents: 'none'
			})

			tl.current = gsap
				.timeline({
					paused: true,
					defaults: {
						duration: config.animation.short,
						ease: config.animation.ease.out
					},
					onStart: () => {
						gsap.set(banner, { pointerEvents: 'auto' })
					}
				})
				.to(banner, {
					autoAlpha: 1,
					y: 0
				})

			return () => {
				tl.current?.kill()
				tl.current = null
			}
		},
		{ scope: ref }
	)

	useEffect(() => {
		const unsubscribe = useCookieConsentStore.persist.onFinishHydration(() => {
			setHydrated(true)
		})

		return unsubscribe
	}, [])

	useEffect(() => {
		if (expired) {
			reset()
		}
	}, [expired, reset])

	useEffect(() => {
		if (!tl.current) {
			return
		}

		if (shouldShow) {
			tl.current.play()
		} else {
			tl.current.pause(0)
			gsap.set(ref.current, {
				autoAlpha: 0,
				y: 16,
				pointerEvents: 'none'
			})
		}
	}, [shouldShow])

	return (
		<aside
			ref={ref}
			className={$.banner}
			aria-label={data.title ?? 'Cookie notice'}>
			<div className={$.content}>
				{data.title ? <p className={$.title}>{data.title}</p> : null}
				{data.html ? (
					<div className={$.text} dangerouslySetInnerHTML={{ __html: data.html }} />
				) : null}
				{data.links?.length ? (
					<ul className={$.links}>
						{data.links.map((link) => (
							<li key={link.id}>
								{link.isExternal || link.target !== '_self' ? (
										<a
											href={link.href}
											target={link.target}
											rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
											{...linkCursorHandlers}>
											{link.label}
										</a>
								) : (
									<TransitionLink href={link.href} transition='fade'>
										{link.label}
									</TransitionLink>
								)}
							</li>
						))}
					</ul>
				) : null}
			</div>
			<div className={$.actions}>
				<Button
					type='button'
					size='small'
					variant='outline'
					onClick={() => decline(data.retentionDays)}>
					{data.declineLabel ?? 'Decline'}
				</Button>
				<Button
					type='button'
					size='small'
					onClick={() => accept(data.retentionDays)}>
					{data.acceptLabel ?? data.consentLabel ?? 'Accept'}
				</Button>
			</div>
		</aside>
	)
}
