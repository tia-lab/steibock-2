'use client'

import { useCursorInteraction } from '@/hooks'
import clsx from 'clsx'
import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import {
	Children,
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useState
} from 'react'
import { ButtonIcon } from '../ButtonIcon'
import $ from './style.module.scss'

type SliderStyle = CSSProperties & {
	'--slider-gap'?: string
	'--slider-slide-size'?: string
}

export type SliderRenderContext = {
	canScrollNext: boolean
	canScrollPrev: boolean
	emblaApi: EmblaCarouselType | undefined
	progress: number
	scrollNext: () => void
	scrollPrev: () => void
	scrollSnaps: number[]
	scrollTo: (index: number) => void
	selectedIndex: number
}

type SliderClasses = {
	container?: string
	control?: string
	controls?: string
	dot?: string
	dotActive?: string
	dots?: string
	progress?: string
	progressBar?: string
	root?: string
	slide?: string
	viewport?: string
}

export type SliderProps = {
	children: ReactNode
	className?: string
	classes?: SliderClasses
	controls?: boolean
	dots?: boolean
	gap?: string
	options?: EmblaOptionsType
	progress?: boolean
	renderDots?: (context: SliderRenderContext) => ReactNode
	renderControls?: (context: SliderRenderContext) => ReactNode
	renderNext?: (context: SliderRenderContext) => ReactNode
	renderPrevious?: (context: SliderRenderContext) => ReactNode
	renderProgress?: (context: SliderRenderContext) => ReactNode
	slideClassName?: string
	slideSize?: string
	slidesPerView?: number
	style?: SliderStyle
}

const getSlidesPerViewSize = (slidesPerView: number) => {
	const safeSlidesPerView = Math.max(1, Math.floor(slidesPerView))

	return `calc((100% + var(--slider-gap)) / ${safeSlidesPerView})`
}

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

export const Slider = ({
	children,
	className,
	classes,
	controls = false,
	dots = false,
	gap,
	options,
	progress: showProgress = false,
	renderDots,
	renderControls,
	renderNext,
	renderPrevious,
	renderProgress,
	slideClassName,
	slideSize,
	slidesPerView,
	style: externalStyle
}: SliderProps) => {
	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: 'start',
		containScroll: 'trimSnaps',
		...options
	})
	const [canScrollPrev, setCanScrollPrev] = useState(false)
	const [canScrollNext, setCanScrollNext] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [progress, setProgress] = useState(0)
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
	const controlCursorHandlers = useCursorInteraction<HTMLButtonElement>({
		variant: 'hover'
	})
	const slides = Children.toArray(children)
	const hasControls = controls || dots || showProgress || renderControls
	const style: SliderStyle = {
		...externalStyle,
		...(gap ? { '--slider-gap': gap } : null),
		...(slideSize ? { '--slider-slide-size': slideSize } : null),
		...(slidesPerView
			? {
					'--slider-slide-size': getSlidesPerViewSize(slidesPerView)
				}
			: null)
	}

	const syncState = useCallback(() => {
		if (!emblaApi) {
			return
		}

		setCanScrollPrev(emblaApi.canScrollPrev())
		setCanScrollNext(emblaApi.canScrollNext())
		setSelectedIndex(emblaApi.selectedScrollSnap())
		setProgress(Math.max(0, Math.min(1, emblaApi.scrollProgress())))
		setScrollSnaps(emblaApi.scrollSnapList())
	}, [emblaApi])

	useEffect(() => {
		if (!emblaApi) {
			return
		}

		let active = true
		const updateState = () => {
			if (active) {
				syncState()
			}
		}

		queueMicrotask(updateState)
		emblaApi.on('reInit', updateState)
		emblaApi.on('scroll', updateState)
		emblaApi.on('select', updateState)

		return () => {
			active = false
			emblaApi.off('reInit', updateState)
			emblaApi.off('scroll', updateState)
			emblaApi.off('select', updateState)
		}
	}, [emblaApi, syncState])

	const scrollPrev = useCallback(() => {
		emblaApi?.scrollPrev()
	}, [emblaApi])

	const scrollNext = useCallback(() => {
		emblaApi?.scrollNext()
	}, [emblaApi])

	const scrollTo = useCallback(
		(index: number) => {
			emblaApi?.scrollTo(index)
		},
		[emblaApi]
	)

	const renderContext: SliderRenderContext = {
		canScrollNext,
		canScrollPrev,
		emblaApi,
		progress,
		scrollNext,
		scrollPrev,
		scrollSnaps,
		scrollTo,
		selectedIndex
	}

	if (!slides.length) {
		return null
	}

	return (
		<div className={clsx($.slider, className, classes?.root)} style={style}>
			<div className={clsx($.viewport, classes?.viewport)} ref={emblaRef}>
				<div className={clsx($.container, classes?.container)}>
					{slides.map((slide, index) => (
						<div
							className={clsx($.slide, slideClassName, classes?.slide)}
							key={index}>
							{slide}
						</div>
					))}
				</div>
			</div>

			{hasControls ? (
				<div className={clsx($.footer, classes?.controls)}>
					{renderControls?.(renderContext) ?? (
						<>
							{controls
								? (renderPrevious?.(renderContext) ?? (
										<ButtonIcon
											aria-label='Previous slide'
											className={clsx($.control, classes?.control)}
											disabled={!canScrollPrev}
											onClick={scrollPrev}
											size='medium'
											type='button'
											variant='outline'>
											<ArrowLeftIcon />
										</ButtonIcon>
									))
								: null}

							{dots
								? (renderDots?.(renderContext) ?? (
										<div className={clsx($.dots, classes?.dots)}>
											{scrollSnaps.map((_, index) => (
												<button
													aria-current={index === selectedIndex ? 'true' : undefined}
													aria-label={`Go to slide ${index + 1}`}
													className={clsx(
														$.dot,
														classes?.dot,
														index === selectedIndex && $.dot_active,
														index === selectedIndex && classes?.dotActive
													)}
													key={index}
													onClick={() => scrollTo(index)}
													type='button'
													{...controlCursorHandlers}
												/>
											))}
										</div>
									))
								: null}

							{showProgress
								? (renderProgress?.(renderContext) ?? (
										<div
											aria-hidden='true'
											className={clsx($.progress, classes?.progress)}>
											<div
												className={clsx($.progress_bar, classes?.progressBar)}
												style={{ transform: `scaleX(${progress})` }}
											/>
										</div>
									))
								: null}

							{controls
								? (renderNext?.(renderContext) ?? (
										<ButtonIcon
											aria-label='Next slide'
											className={clsx($.control, classes?.control)}
											disabled={!canScrollNext}
											onClick={scrollNext}
											size='medium'
											type='button'
											variant='outline'>
											<ArrowRightIcon />
										</ButtonIcon>
									))
								: null}
						</>
					)}
				</div>
			) : null}
		</div>
	)
}
