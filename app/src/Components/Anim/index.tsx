import {
	Fragment,
	createElement,
	type ComponentPropsWithoutRef,
	type ReactElement,
	useId
} from 'react'
import type {
	ElementAnimationMediaOverrides,
	ElementAnimationName
} from '@/animations/elements'
import type { gsap, ScrollTrigger } from '@/gsap'
import { AnimRuntime } from './runtime'

type IntrinsicTag = keyof React.JSX.IntrinsicElements

type ElementAnimationOwnProps = {
	type?: ElementAnimationName
	fromVars?: gsap.TweenVars
	vars?: gsap.TweenVars
	scrollTrigger?: ScrollTrigger.Vars
	media?: ElementAnimationMediaOverrides
	buttonType?: 'button' | 'submit' | 'reset'
}

type AnimElementProps<Tag extends IntrinsicTag> = Omit<
	ComponentPropsWithoutRef<Tag>,
	keyof ElementAnimationOwnProps
> &
	ElementAnimationOwnProps

type AnimElementComponent<Tag extends IntrinsicTag> = (
	props: AnimElementProps<Tag>
) => ReactElement

type AnimFactory = {
	[Tag in IntrinsicTag]: AnimElementComponent<Tag>
}

const componentCache = new Map<IntrinsicTag, AnimElementComponent<IntrinsicTag>>()

const createAnimElement = <Tag extends IntrinsicTag>(
	tag: Tag
): AnimElementComponent<Tag> => {
	const Component = ({
		type,
		fromVars,
		vars,
		scrollTrigger,
		media,
		buttonType,
		children,
		...props
	}: AnimElementProps<Tag>) => {
		const generatedId = `anim-${useId().replaceAll(':', '')}`
		const targetId = typeof props.id === 'string' ? props.id : generatedId
		const elementProps = {
			...props,
			...(type ? { id: targetId } : null),
			...(tag === 'button' ? { type: buttonType ?? 'button' } : null)
		} as React.JSX.IntrinsicElements[Tag]

		return (
			<Fragment>
				{createElement(tag, elementProps, children)}
				{type ? (
					<AnimRuntime
						targetId={targetId}
						type={type}
						fromVars={fromVars}
						vars={vars}
						scrollTrigger={scrollTrigger}
						media={media}
					/>
				) : null}
			</Fragment>
		)
	}

	Component.displayName = `Anim.${tag}`

	return Component as AnimElementComponent<Tag>
}

export const Anim = new Proxy({} as AnimFactory, {
	get: (target, property: string | symbol) => {
		if (typeof property !== 'string') {
			return undefined
		}

		const tag = property as IntrinsicTag
		const cached = componentCache.get(tag)

		if (cached) {
			return cached
		}

		const component = createAnimElement(tag)
		componentCache.set(tag, component)

		return component
	}
})
