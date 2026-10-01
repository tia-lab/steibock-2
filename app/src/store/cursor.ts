import { create } from 'zustand'

export type CursorVariant = 'default' | 'hover' | 'active' | 'hidden'

type CursorState = {
	variant: CursorVariant
	label: string | null
	locked: boolean
}

type CursorActions = {
	setVariant: (variant: CursorVariant) => void
	setLabel: (label: CursorState['label']) => void
	setState: (input: Partial<CursorState>) => void
	reset: () => void
	lock: () => void
	unlock: () => void
}

export type CursorStore = CursorState & CursorActions

const initialState: CursorState = {
	variant: 'default',
	label: null,
	locked: false
}

export const useCursorStore = create<CursorStore>()((set) => ({
	...initialState,
	setVariant: (variant) => set({ variant }),
	setLabel: (label) => set({ label }),
	setState: (input) => set(input),
	reset: () => set(initialState),
	lock: () => set({ locked: true }),
	unlock: () => set({ locked: false })
}))
