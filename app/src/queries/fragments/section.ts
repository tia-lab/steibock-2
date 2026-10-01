import { graphql } from '@/lib/craft/graphql'
import { AssetImageFragment, AssetUrlFragment } from './asset'

export const RenderableSectionFragment = graphql(
	`
		fragment RenderableSectionFragment on EntryInterface {
			__typename
			... on sectionHero_Entry {
				id
				title
				typeHandle
				subtitle
				image {
					...AssetImageFragment
				}
			}
			... on sectionLinks_Entry {
				id
				title
				typeHandle
			}
			... on sectionNews_Entry {
				id
				title
				typeHandle
				subtitle
				itemsLimit
				orderBy
				selectedNews {
					... on news_Entry {
						__typename
						id
						title
						uri
						postDate
						excerpt
						newsKategorie {
							__typename
							id
							title
						}
						image {
							...AssetImageFragment
						}
					}
				}
			}
			... on sectionProjects_Entry {
				id
				title
				typeHandle
				subtitle
				itemsLimit
				itemsPerPage
				orderBy
				selectedProjects {
					... on project_Entry {
						__typename
						id
						title
						uri
						excerpt
						image {
							...AssetImageFragment
						}
					}
				}
			}
			... on sectionVideo_Entry {
				id
				title
				typeHandle
				image {
					...AssetImageFragment
				}
				video {
					...AssetUrlFragment
				}
				button {
					label
					url
					target
				}
			}
			... on sectionImageText_Entry {
				id
				title
				typeHandle
				subtitle
				richText {
					html
				}
				image {
					...AssetImageFragment
				}
				imagePosition
				button {
					label
					url
					target
				}
			}
			... on sectionTeam_Entry {
				id
				title
				typeHandle
				subtitle
				itemsLimit
				itemsPerPage
				orderBy
				selectedTeam {
					... on person_Entry {
						__typename
						id
						title
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
			... on sectionHistory_Entry {
				id
				title
				typeHandle
			}
			... on sectionTeamCta_Entry {
				id
				title
				typeHandle
				caption
				subtitle
			}
			... on sectionGallery_Entry {
				id
				title
				typeHandle
				gallery {
					...AssetImageFragment
				}
			}
			... on sectionFaqs_Entry {
				id
				title
				typeHandle
				accordions {
					... on accordion_Entry {
						__typename
						id
						title
						subtitle
						richText {
							html
						}
						gallery {
							...AssetImageFragment
						}
					}
				}
			}
			... on sectionAccordions_Entry {
				id
				title
				typeHandle
				accordions {
					... on accordion_Entry {
						__typename
						id
						title
						subtitle
						richText {
							html
						}
						gallery {
							...AssetImageFragment
						}
					}
				}
			}
		}
	`,
	[AssetImageFragment, AssetUrlFragment]
)

export const SectionFragment = graphql(
	`
		fragment SectionFragment on sections_MatrixField {
			__typename
			...RenderableSectionFragment
		}
	`,
	[RenderableSectionFragment]
)
