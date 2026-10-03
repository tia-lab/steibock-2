export const pageItems = <Item>(
	items: ReadonlyArray<Item>,
	page: number,
	itemsPerPage: number
) => items.slice((page - 1) * itemsPerPage, page * itemsPerPage)
