import { createStore } from 'zustand'
import type { PageTransitionName } from '@/animations/transitions'

export type { PageTransitionName } from '@/animations/transitions'

export const pageLifecycleStatuses = [
	'idle',
	'leaving',
	'navigating',
	'entering'
] as const

export type PageLifecycleStatus = (typeof pageLifecycleStatuses)[number]

export type PageLifecycleStartInput = {
	from?: string | null
	to: string
	transition?: PageTransitionName
}

export type PageLifecycleState = {
	id: number
	status: PageLifecycleStatus
	current: string | null
	from: string | null
	to: string | null
	transition: PageTransitionName
	startedAt: number | null
	updatedAt: number | null
}

type PageLifecycleActions = {
	setCurrent: (current: PageLifecycleState['current']) => void
	start: (input: PageLifecycleStartInput) => number
	markNavigating: (id?: PageLifecycleState['id']) => void
	markEntering: (id?: PageLifecycleState['id']) => void
	complete: (id?: PageLifecycleState['id']) => void
	cancel: () => void
	reset: () => void
}

export type PageLifecycleStore = PageLifecycleState & PageLifecycleActions

const initialState: PageLifecycleState = {
	id: 0,
	status: 'idle',
	current: null,
	from: null,
	to: null,
	transition: 'none',
	startedAt: null,
	updatedAt: null
}

const canUpdateTransition = (
	currentId: PageLifecycleState['id'],
	incomingId?: PageLifecycleState['id']
) => incomingId === undefined || incomingId === currentId

export const usePageLifecycleStore = createStore<PageLifecycleStore>()(
	(set, get) => ({
		...initialState,
		setCurrent: (current) => {
			set({
				current,
				updatedAt: Date.now()
			})
		},
		start: ({ from, to, transition = 'none' }) => {
			const state = get()
			const id = get().id + 1
			const now = Date.now()

			set({
				id,
				status: 'leaving',
				current: state.current,
				from: from ?? state.current,
				to,
				transition,
				startedAt: now,
				updatedAt: now
			})

			return id
		},
		markNavigating: (id) => {
			const state = get()

			if (!canUpdateTransition(state.id, id)) {
				return
			}

			set({
				status: 'navigating',
				updatedAt: Date.now()
			})
		},
		markEntering: (id) => {
			const state = get()

			if (!canUpdateTransition(state.id, id)) {
				return
			}

			set({
				status: 'entering',
				current: state.to ?? state.current,
				updatedAt: Date.now()
			})
		},
		complete: (id) => {
			const state = get()

			if (!canUpdateTransition(state.id, id)) {
				return
			}

			set({
				...initialState,
				id: state.id,
				current: state.to ?? state.current
			})
		},
		cancel: () => {
			const state = get()

			set({
				...initialState,
				id: state.id,
				current: state.current
			})
		},
		reset: () => {
			set(initialState)
		}
	})
)
