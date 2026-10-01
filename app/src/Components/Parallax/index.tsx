import {
	Fragment,
	createElement,
	type ComponentPropsWithoutRef,
	type ReactElement,
	useId
} from 'react'
import type { ElementAnimationMediaOverrides } from '@/animations/elements'
import type { gsap, ScrollTrigger } from '@/gsap'
import { ParallaxRuntime, type ParallaxAxis } from './runtime'

type IntrinsicTag = keyof React.JSX.IntrinsicElements

type ParallaxOwnProps = {
	speed?: number
	axis?: ParallaxAxis
	fromVars?: gsap.TweenVars
	vars?: gsap.TweenVars
	scrollTrigger?: ScrollTrigger.Vars
	media?: ElementAnimationMediaOverrides
	buttonType?: 'button' | 'submit' | 'reset'
}

type ParallaxElementProps<Tag extends IntrinsicTag> = Omit<
	ComponentPropsWithoutRef<Tag>,
	keyof ParallaxOwnProps
> &
		ParallaxOwnProps

type ParallaxBaseProps<Tag extends IntrinsicTag> = ParallaxElementProps<Tag> & {
	as?: Tag
}

type ParallaxElementComponent<Tag extends IntrinsicTag> = (
	props: ParallaxElementProps<Tag>
) => ReactElement

type ParallaxBaseComponent = <Tag extends IntrinsicTag = 'div'>(
	props: ParallaxBaseProps<Tag>
) => ReactElement

type ParallaxFactory = ParallaxBaseComponent & {
	[Tag in IntrinsicTag]: ParallaxElementComponent<Tag>
}

const componentCache = new Map<
	IntrinsicTag,
	ParallaxElementComponent<IntrinsicTag>
>()

const createParallaxElement = <Tag extends IntrinsicTag>(
	tag: Tag
): ParallaxElementComponent<Tag> => {
	const Component = ({
		speed,
		axis,
		fromVars,
		vars,
		scrollTrigger,
		media,
		buttonType,
		children,
		...props
	}: ParallaxElementProps<Tag>) => {
		const generatedId = `parallax-${useId().replaceAll(':', '')}`
		const targetId = typeof props.id === 'string' ? props.id : generatedId
		const elementProps = {
			...props,
			id: targetId,
			...(tag === 'button' ? { type: buttonType ?? 'button' } : null)
		} as React.JSX.IntrinsicElements[Tag]

		return (
			<Fragment>
				{createElement(tag, elementProps, children)}
				<ParallaxRuntime
					targetId={targetId}
					speed={speed}
					axis={axis}
					fromVars={fromVars}
					vars={vars}
					scrollTrigger={scrollTrigger}
					media={media}
				/>
			</Fragment>
		)
	}

	Component.displayName = `Parallax.${tag}`

	return Component as ParallaxElementComponent<Tag>
}

const getParallaxElement = <Tag extends IntrinsicTag>(
	tag: Tag
): ParallaxElementComponent<Tag> => {
	const cached = componentCache.get(tag)

	if (cached) {
		return cached as ParallaxElementComponent<Tag>
	}

	const component = createParallaxElement(tag)
	componentCache.set(tag, component as ParallaxElementComponent<IntrinsicTag>)

	return component
}

const ParallaxBase = (<Tag extends IntrinsicTag = 'div'>({
	as,
	...props
}: ParallaxBaseProps<Tag>) => {
	const tag = as ?? ('div' as Tag)
	const Component = getParallaxElement(tag)

	return <Component {...(props as ParallaxElementProps<typeof tag>)} />
}) as ParallaxBaseComponent

export const Parallax = new Proxy(ParallaxBase as ParallaxFactory, {
	get: (target, property: string | symbol) => {
		if (typeof property !== 'string') {
			return Reflect.get(target, property)
		}

		if (property in target) {
			return Reflect.get(target, property)
		}

		return getParallaxElement(property as IntrinsicTag)
	}
})

export type { ParallaxAxis, ParallaxElementProps }
