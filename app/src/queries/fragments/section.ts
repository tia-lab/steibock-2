import { graphql } from '@/lib/craft/graphql'
import { AssetImageFragment, AssetUrlFragment } from './asset'
import { FreeformFormFragment } from './freeform'

export const RenderableSectionFragment = graphql(
	`
		fragment RenderableSectionFragment on EntryInterface {
			__typename
			... on sectionHero_Entry {
				id
				title
				typeHandle
				heroTitle
				subtitle
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
				isHomePage
				showCallout
				calloutTitle
				calloutSubtitle
				calloutLink {
					label
					defaultLabel
					url
					target
					entry {
						uri
					}
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
			... on sectionJobs_Entry {
				id
				title
				typeHandle
				subtitle
				itemsLimit
				itemsPerPage
				orderBy
				showCategoryFilters
				selectedJobs {
					... on job_Entry {
						__typename
						id
						title
						uri
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
				teamVariant
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
			... on sectionDownloads_Entry {
				id
				title
				typeHandle
				downloads {
					... on download_Entry {
						__typename
						id
						button {
							label
							defaultLabel
							url
							target
							download
							filename
							asset {
								title
							}
							entry {
								uri
							}
						}
					}
				}
			}
			... on sectionFaqs_Entry {
				id
				title
				typeHandle
				button {
					label
					defaultLabel
					url
					target
					entry {
						uri
					}
				}
				faqs {
					... on faq_Entry {
						__typename
						id
						title
						richText {
							html
						}
					}
				}
			}
			... on sectionServices_Entry {
				id
				title
				typeHandle
				button {
					label
					defaultLabel
					url
					target
					entry {
						uri
					}
				}
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
			... on sectionContact_Entry {
				id
				title
				typeHandle
				email
				phone
				subtitle
				address
				mapLink {
					label
					url
					target
				}
			}
			... on sectionForm_Entry {
				id
				title
				typeHandle
				richText {
					html
				}
				form {
					...FreeformFormFragment
				}
			}
			... on sectionSolutions_Entry {
				id
				title
				typeHandle
				showCategoryFilters
				solutions {
					... on solution_Entry {
						__typename
						id
						title
						solutionCategories {
							id
							title
						}
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
	[AssetImageFragment, AssetUrlFragment, FreeformFormFragment]
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
