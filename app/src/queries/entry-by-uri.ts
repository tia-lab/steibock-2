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
				... on serviceAreaPage_Entry {
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
				... on job_Entry {
					pageSeo {
						...SeoFragment
					}
					jobCategories {
						id
						title
					}
					hero {
						...AssetImageFragment
					}
					introText
					richText {
						html
					}
					button {
						label
						defaultLabel
						url
						target
						entry {
							uri
						}
					}
					whatsApp {
						label
						defaultLabel
						url
						target
						entry {
							uri
						}
					}
					contactPerson {
						... on person_Entry {
							id
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
