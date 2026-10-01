'use client'

import { ButtonIcon } from '@/Components/ButtonIcon'
import { Slider } from '@/Components/Slider'
import { type ReactNode } from 'react'
import $ from './style.module.scss'

const ArrowLeftIcon = () => (
	<svg aria-hidden='true' fill='none' viewBox='0 0 24 24'>
		<path d='M15 18l-6-6 6-6' stroke='currentColor' strokeLinecap='round' />
	</svg>
)

const ArrowRightIcon = () => (
	<svg aria-hidden='true' fill='none' viewBox='0 0 24 24'>
		<path d='M9 6l6 6-6 6' stroke='currentColor' strokeLinecap='round' />
	</svg>
)

export const NewsSlider = ({ children }: { children: ReactNode }) => (
	<Slider
		classes={{ controls: $.slider_controls }}
		className={$.slider}
		gap='4rem'
		renderControls={(slider) => (
			<>
				<div className={$.slider_arrows}>
					<ButtonIcon
						aria-label='Previous slide'
						className={$.slider_arrow}
						disabled={!slider.canScrollPrev}
						onClick={slider.scrollPrev}
						size='medium'
						type='button'
						variant='outline'>
						<ArrowLeftIcon />
					</ButtonIcon>
					<ButtonIcon
						aria-label='Next slide'
						className={$.slider_arrow}
						disabled={!slider.canScrollNext}
						onClick={slider.scrollNext}
						size='medium'
						type='button'
						variant='outline'>
						<ArrowRightIcon />
					</ButtonIcon>
				</div>
				<div aria-hidden='true' className={$.slider_progress}>
					<div
						className={$.slider_progress_bar}
						style={{ transform: `scaleX(${slider.progress})` }}
					/>
				</div>
			</>
		)}
		slideSize='24rem'>
		{children}
	</Slider>
)
