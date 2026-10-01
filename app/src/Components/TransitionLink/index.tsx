'use client'

import { type PageTransitionName } from '@/animations/transitions'
import { useCursorInteraction, usePageTransition } from '@/hooks'
import Link, { type LinkProps } from 'next/link'
import { type AnchorHTMLAttributes, type MouseEvent } from 'react'

type TransitionLinkProps = LinkProps &
	Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
		children?: React.ReactNode
		transition?: PageTransitionName
	}

const shouldSkipTransition = (event: MouseEvent<HTMLAnchorElement>) => {
	return (
		event.defaultPrevented ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey ||
		event.button !== 0
	)
}

export const TransitionLink = ({
	href,
	replace,
	transition,
	onClick,
	onPointerEnter,
	onPointerLeave,
	onPointerDown,
	onPointerUp,
	children,
	...props
}: TransitionLinkProps) => {
	const { navigate } = usePageTransition()
	const cursorHandlers = useCursorInteraction<HTMLAnchorElement>({
		variant: 'hover'
	})

	return (
		<Link
			href={href}
			onPointerEnter={(event) => {
				onPointerEnter?.(event)
				cursorHandlers.onPointerEnter?.(event)
			}}
			onPointerLeave={(event) => {
				onPointerLeave?.(event)
				cursorHandlers.onPointerLeave?.(event)
			}}
			onPointerDown={(event) => {
				onPointerDown?.(event)
				cursorHandlers.onPointerDown?.(event)
			}}
			onPointerUp={(event) => {
				onPointerUp?.(event)
				cursorHandlers.onPointerUp?.(event)
			}}
			onClick={(event) => {
				onClick?.(event)

				if (shouldSkipTransition(event)) {
					return
				}

				event.preventDefault()
				navigate(typeof href === 'string' ? href : (href.pathname ?? ''), {
					replace,
					transition
				})
			}}
			replace={replace}
			{...props}
		>
			{children}
		</Link>
	)
}
