import { graphql } from '@/lib/craft/graphql'
import { AssetImageFragment } from './fragments/asset'

export const TeamIndexQuery = graphql(
	`
		query TeamIndex($limit: Int = 100, $orderBy: String = "title ASC") {
			entries(section: "team", type: "person", orderBy: $orderBy, limit: $limit) {
				__typename
				id
				title
				... on person_Entry {
					firstName
					lastName
					role
					email
					phone
					image {
						...AssetImageFragment
					}
				}
			}
		}
	`,
	[AssetImageFragment]
)
