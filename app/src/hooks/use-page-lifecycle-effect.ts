'use client'

import {
	usePageLifecycleStore,
	type PageLifecycleState,
	type PageLifecycleStatus
} from '@/store'
import { useEffect, useRef } from 'react'

export type PageLifecycleEffectCallback = (
	state: PageLifecycleState
) => void

export const usePageLifecycleEffect = (
	status: PageLifecycleStatus,
	callback: PageLifecycleEffectCallback
) => {
	const callbackRef = useRef(callback)

	useEffect(() => {
		callbackRef.current = callback
	}, [callback])

	useEffect(() => {
		let previousStatus = usePageLifecycleStore.getState().status

		return usePageLifecycleStore.subscribe((state) => {
			if (state.status === status && previousStatus !== status) {
				callbackRef.current(state)
			}

			previousStatus = state.status
		})
	}, [status])
}
