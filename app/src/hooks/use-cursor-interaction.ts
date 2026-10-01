'use client'

import { config } from '$/config'
import {
	useCursorStore,
	type CursorVariant
} from '@/store'
import {
	useMemo,
	type PointerEventHandler
} from 'react'

export type CursorInteractionOptions = {
	variant?: CursorVariant
	label?: string | null
	disabled?: boolean
}

export type CursorInteractionHandlers<
	TElement extends Element = HTMLElement
> = {
	onPointerEnter?: PointerEventHandler<TElement>
	onPointerLeave?: PointerEventHandler<TElement>
	onPointerDown?: PointerEventHandler<TElement>
	onPointerUp?: PointerEventHandler<TElement>
}

export const useCursorInteraction = <
	TElement extends Element = HTMLElement
>({
	variant = 'hover',
	label = null,
	disabled = false
}: CursorInteractionOptions = {}): CursorInteractionHandlers<TElement> => {
	const isDisabled = !config.cursor.enabled || disabled

	return useMemo(() => {
		if (isDisabled) {
			return {}
		}

		const setHoverState = () => {
			const cursor = useCursorStore.getState()

			if (cursor.locked) {
				return
			}

			cursor.setState({
				variant,
				label
			})
		}

		const resetHoverState = () => {
			const cursor = useCursorStore.getState()

			if (cursor.locked) {
				return
			}

			cursor.reset()
		}

		return {
			onPointerEnter: setHoverState,
			onPointerLeave: resetHoverState,
			onPointerDown: () => {
				const cursor = useCursorStore.getState()

				if (cursor.locked) {
					return
				}

				cursor.setVariant('active')
			},
			onPointerUp: setHoverState
		}
	}, [isDisabled, label, variant])
}
