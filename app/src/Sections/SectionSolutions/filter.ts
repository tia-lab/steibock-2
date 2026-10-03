export const matchesCategory = (
	categoryIds: ReadonlyArray<string | null | undefined>,
	activeCategory: string | null
) => activeCategory === null || categoryIds.includes(activeCategory)
