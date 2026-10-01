export type PageTransitionContext = {
	id: number
	from: string | null
	to: string
	root: HTMLElement | null
	signal: AbortSignal
}

export type PageTransition = {
	rootSelector?: string
	leave?: (context: PageTransitionContext) => Promise<void> | void
	enter?: (context: PageTransitionContext) => Promise<void> | void
}
