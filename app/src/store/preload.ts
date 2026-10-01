import { create } from 'zustand'
import {
	createJSONStorage,
	persist,
	type StateStorage
} from 'zustand/middleware'

export type PreloadStatus = 'idle' | 'running' | 'done'

type PreloadState = {
	status: PreloadStatus
	hasCompleted: boolean
}

type PreloadActions = {
	start: () => void
	complete: () => void
	reset: () => void
}

export type PreloadStore = PreloadState & PreloadActions

const storageKey = 'ubiq-preload'

const initialState: PreloadState = {
	status: 'idle',
	hasCompleted: false
}

const noopStorage: StateStorage = {
	getItem: () => null,
	setItem: () => undefined,
	removeItem: () => undefined
}

const getSessionStorage = () => {
	if (typeof window === 'undefined') {
		return noopStorage
	}

	return window.sessionStorage
}

export const usePreloadStore = create<PreloadStore>()(
	persist(
		(set) => ({
			...initialState,
			start: () => set({ status: 'running' }),
			complete: () =>
				set({
					status: 'done',
					hasCompleted: true
				}),
			reset: () => set(initialState)
		}),
		{
			name: storageKey,
			storage: createJSONStorage(getSessionStorage),
			partialize: ({ status, hasCompleted }) => ({
				status,
				hasCompleted
			})
		}
	)
)
