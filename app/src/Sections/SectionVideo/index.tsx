'use client'

import { config } from '$/config'
import { Anim, Button, Container, ImageCraft, Wrapper } from '@/Components'
import { gsap } from '@/gsap'
import { useGSAP, useKeypress } from '@/hooks'
import { normalizeCraftAssetUrl } from '@/lib/craft/assets'
import {
	AssetUrlFragment,
	RenderableSectionFragment
} from '@/queries'
import { readFragment } from 'gql.tada'
import { useEffect, useRef, useState } from 'react'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

export const SectionVideo = ({ section }: SectionComponentProps) => {
	const source = readFragment(RenderableSectionFragment, section)
	const data = source.__typename === 'sectionVideo_Entry' ? source : null
	const [open, setOpen] = useState(false)
	const [hover, setHover] = useState(false)
	const sectionRef = useRef<HTMLElement>(null)
	const videoRef = useRef<HTMLVideoElement>(null)
	const timeline = useRef<GSAPTimeline | null>(null)
	const hoverTimeline = useRef<GSAPTimeline | null>(null)
	const image = data?.image[0] ?? null
	const file = data?.video[0]
		? readFragment(AssetUrlFragment, data.video[0])
		: null
	const src = normalizeCraftAssetUrl(file?.url) ?? file?.url

	useKeypress('Escape', () => {
		if (open) setOpen(false)
	})

	useGSAP(
		() => {
			if (!sectionRef.current || !src || !image) return

			const video = '[data-video]'
			const button = '[data-button]'
			const icon = '[data-icon]'
			const background = '[data-bg]'
			const trigger = '[data-trigger]'
			const close = '[data-close]'

			gsap.set([video, close], { autoAlpha: 0 })
			timeline.current = gsap.timeline({
				paused: true,
				defaults: {
					duration: config.animation.default,
					ease: config.animation.ease.out
				}
			})
			timeline.current
				.to(video, { autoAlpha: 1 })
				.to(button, { width: '100%', height: '100%' }, '<')
				.to(close, { autoAlpha: 1, duration: config.animation.short })

			hoverTimeline.current = gsap.timeline({
				paused: true,
				defaults: {
					duration: config.animation.short,
					ease: config.animation.ease.out
				}
			})
			hoverTimeline.current
				.to(icon, { scale: 1.2 })
				.to(background, { scale: 1.05 }, '<')
				.to(trigger, { scale: 1.05 }, '<')
		},
		{ scope: sectionRef }
	)

	useEffect(() => {
		if (open) {
			timeline.current?.play()
			void videoRef.current?.play().catch(() => setOpen(false))
			return
		}

		videoRef.current?.pause()
		timeline.current?.timeScale(1.2).reverse()
	}, [open])

	useEffect(() => {
		hover ? hoverTimeline.current?.play() : hoverTimeline.current?.reverse()
	}, [hover])

	if (!data || !src || !image) return null

	return (
		<section
			ref={sectionRef}
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			className={$.section}>
			<Wrapper>
				<Container>
					<Anim.div className={$.frame} type='fade'>
						<div className={$.bg}>
							<ImageCraft
								className={$.image}
								image={image}
								data-bg
								ratio='16:9'
							/>
							<div className={$.overlay} />
						</div>
						<div className={$.content}>
							{data.title ? <h2 className='text-cpt'>{data.title}</h2> : null}
							{data.button?.url ? (
								<Button
									href={data.button.url}
									target={data.button.target === '_blank' ? '_blank' : '_self'}
									transition='fade'>
									{data.button.label ?? data.button.url}
								</Button>
							) : null}
						</div>
						<div
							className={$.video_button}
							data-button
							onMouseEnter={() => setHover(true)}
							onMouseLeave={() => setHover(false)}>
							<video
								ref={videoRef}
								src={src}
								controls
								playsInline
								preload='none'
								onEnded={() => setOpen(false)}
								className={$.video}
								data-video
							/>
							<button
								type='button'
								className={$.trigger}
								onClick={() => setOpen(true)}
								data-trigger
								aria-label='Video abspielen'>
								<ImageCraft className={$.image_button} image={image} />
								<svg
									className={$.play_icon}
									data-icon
									xmlns='http://www.w3.org/2000/svg'
									viewBox='0 0 32 32'
									fill='none'
									aria-hidden='true'>
									<path
										d='M16.0003 2.66602C8.64033 2.66602 2.66699 8.63935 2.66699 15.9993C2.66699 23.3593 8.64033 29.3327 16.0003 29.3327C23.3603 29.3327 29.3337 23.3593 29.3337 15.9993C29.3337 8.63935 23.3603 2.66602 16.0003 2.66602ZM12.667 21.9993V9.99935L22.0003 15.9993L12.667 21.9993Z'
										fill='white'
									/>
								</svg>
							</button>
						</div>
						<Button className={$.close} data-close onClick={() => setOpen(false)}>
							Schliessen
						</Button>
					</Anim.div>
				</Container>
			</Wrapper>
		</section>
	)
}
