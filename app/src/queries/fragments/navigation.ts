import { graphql } from '@/lib/craft/graphql'

export const NavigationFragment = graphql(`
	fragment NavigationFragment on navigation_Entry {
		id
		title
		navigationHandle
		maxDepth
		navigationItems {
			... on navigationItem_Entry {
				__typename
				id
				title
				typeHandle
				externalUrl
				openInNewTab
				pageLink {
					id
					title
					uri
				}
				navigationChildren {
					... on navigationItem_Entry {
						__typename
						id
						title
						typeHandle
						externalUrl
						openInNewTab
						pageLink {
							id
							title
							uri
						}
						navigationChildren {
							... on navigationItem_Entry {
								__typename
								id
								title
								typeHandle
								externalUrl
								openInNewTab
								pageLink {
									id
									title
									uri
								}
								navigationChildren {
									... on navigationItem_Entry {
										__typename
										id
										title
										typeHandle
										externalUrl
										openInNewTab
										pageLink {
											id
											title
											uri
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
`)
