import { graphql } from '@/lib/craft/graphql'

export const ServiceAreaIndexQuery = graphql(`
	query ServiceAreaIndex {
		entries(section: "pages", type: "serviceAreaPage", orderBy: "lft ASC") {
			__typename
			id
			title
			uri
		}
	}
`)
