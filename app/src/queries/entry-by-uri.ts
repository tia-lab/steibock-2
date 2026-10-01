import { graphql } from '@/lib/craft/graphql'
import { AssetImageFragment } from './fragments/asset'
import { CollectionPageConfigFragment } from './fragments/collection'
import { SectionFragment } from './fragments/section'
import { SeoFragment } from './fragments/seo'

export const EntryByUriQuery = graphql(
	`
		query EntryByUri($uri: [String]) {
			entry(uri: $uri) {
				__typename
				id
				title
				uri
				sectionHandle
				typeHandle
				... on page_Entry {
					pageSeo {
						...SeoFragment
					}
					image {
						...AssetImageFragment
					}
					sections {
						...SectionFragment
					}
				}
				... on legalPage_Entry {
					pageSeo {
						...SeoFragment
					}
					image {
						...AssetImageFragment
					}
					richText {
						html
					}
				}
				... on news_Entry {
					pageSeo {
						...SeoFragment
					}
					postDate
					image {
						...AssetImageFragment
					}
					excerpt
						richText {
							html
						}
					}
				... on collectionPage_Entry {
					pageSeo {
						...SeoFragment
					}
					...CollectionPageConfigFragment
				}
			}
		}
	`,
	[
		AssetImageFragment,
		CollectionPageConfigFragment,
		SectionFragment,
		SeoFragment
	]
)
