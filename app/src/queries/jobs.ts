import { graphql } from '@/lib/craft/graphql'
import { AssetImageFragment } from './fragments/asset'

export const JobsIndexQuery = graphql(
	`
		query JobsIndex(
			$limit: Int = 24
			$orderBy: String = "postDate DESC"
		) {
			entries(section: "jobs", type: "job", orderBy: $orderBy, limit: $limit) {
				__typename
				id
				title
				uri
				... on job_Entry {
					postDate
					introText
					jobCategories {
						id
						title
					}
					hero {
						...AssetImageFragment
					}
				}
			}
		}
	`,
	[AssetImageFragment]
)
