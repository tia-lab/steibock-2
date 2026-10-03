'use client'

import { useState } from 'react'
import { ImageCraft, Wrapper } from '@/Components'
import { AssetImageFragment, RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import { matchesCategory } from './filter'
import $ from './style.module.scss'

export const SectionSolutions = ({ section }: SectionComponentProps) => {
	const source = readFragment(RenderableSectionFragment, section)
	const [activeCategory, setActiveCategory] = useState<string | null>(null)

	if (source.__typename !== 'sectionSolutions_Entry') return null

	const items = source.solutions.filter(
		(item): item is NonNullable<typeof item> =>
			item?.__typename === 'solution_Entry'
	)
	const categories = new Map<string, string>()

	items.forEach((item) =>
		item.solutionCategories.forEach((category) => {
			if (category?.id && category.title) {
				categories.set(category.id, category.title)
			}
		})
	)

	const visibleItems = items.filter((item) =>
		matchesCategory(
			item.solutionCategories.map((category) => category?.id),
			activeCategory
		)
	)

	return (
		<section
			data-section-id={source.id ?? undefined}
			data-section-type={source.typeHandle ?? undefined}
			className={$.section}>
			<Wrapper>
				<div className={$.content}>
					<h2>{source.title}</h2>
					{source.showCategoryFilters && categories.size ? (
						<div className={$.filters} aria-label='Lösungen filtern'>
							<button
								type='button'
								aria-pressed={activeCategory === null}
								onClick={() => setActiveCategory(null)}>
								Alle
							</button>
							{[...categories].map(([id, title]) => (
								<button
									key={id}
									type='button'
									aria-pressed={activeCategory === id}
									onClick={() => setActiveCategory(id)}>
									{title}
								</button>
							))}
						</div>
					) : null}
					<div className={$.list}>
						{visibleItems.map((item) => {
							const richText = item.richText?.html
								?.replace(/<[^>]*>/g, ' ')
								.replace(/\s+/g, ' ')
								.trim()

							return (
								<details key={item.id ?? item.title} className={$.item}>
									<summary>{item.title}</summary>
									<div className={$.answer}>
										{item.subtitle ? <p>{item.subtitle}</p> : null}
										{richText ? <p>{richText}</p> : null}
										{item.gallery.length ? (
											<div className={$.gallery}>
												{item.gallery.map((image, index) => {
													if (!image) return null

													const asset = readFragment(AssetImageFragment, image)

													return (
														<ImageCraft
															key={asset.id ?? index}
															image={image}
															className={$.image}
														/>
													)
												})}
											</div>
										) : null}
									</div>
								</details>
							)
						})}
					</div>
				</div>
			</Wrapper>
		</section>
	)
}
