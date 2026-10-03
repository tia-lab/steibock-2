'use client'

import { useState } from 'react'
import { ImageCraft, TransitionLink, Wrapper } from '@/Components'
import { pathFromCraftUri } from '@/lib/craft/preview'
import {
	AssetImageFragment,
	JobsIndexQuery,
	RenderableSectionFragment
} from '@/queries'
import type { FragmentOf, ResultOf } from 'gql.tada'
import { matchesCategory } from '../SectionSolutions/filter'
import { pageItems } from './pagination'
import $ from './style.module.scss'

type SectionJobsEntry = Extract<
	FragmentOf<typeof RenderableSectionFragment>,
	{ __typename?: 'sectionJobs_Entry' }
>
type SelectedJob = NonNullable<
	NonNullable<SectionJobsEntry['selectedJobs']>[number]
>
type FallbackJob = NonNullable<
	NonNullable<ResultOf<typeof JobsIndexQuery>['entries']>[number]
>
export type JobListItem = Extract<SelectedJob | FallbackJob, { __typename: 'job_Entry' }>

type Props = {
	id?: string | null
	typeHandle?: string | null
	title?: string | null
	subtitle?: string | null
	jobs: ReadonlyArray<JobListItem>
	showCategoryFilters: boolean
	itemsPerPage: number
}

export const JobsList = ({
	id,
	typeHandle,
	title,
	subtitle,
	jobs,
	showCategoryFilters,
	itemsPerPage
}: Props) => {
	const [activeCategory, setActiveCategory] = useState<string | null>(null)
	const [page, setPage] = useState(1)
	const categories = new Map<string, string>()

	jobs.forEach((job) =>
		job.jobCategories.forEach((category) => {
			if (category?.id && category.title) categories.set(category.id, category.title)
		})
	)

	const filtered = jobs.filter((job) =>
		matchesCategory(
			job.jobCategories.map((category) => category?.id),
			activeCategory
		)
	)
	const pageCount = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
	const currentPage = Math.min(page, pageCount)
	const visibleJobs = pageItems(filtered, currentPage, itemsPerPage)

	const filterBy = (category: string | null) => {
		setActiveCategory(category)
		setPage(1)
	}

	return (
		<section
			data-section-id={id ?? undefined}
			data-section-type={typeHandle ?? undefined}
			className={$.section}>
			<Wrapper container>
				<div className={$.head}>
					{title ? <h2>{title}</h2> : null}
					{subtitle ? <p>{subtitle}</p> : null}
				</div>
				{showCategoryFilters && categories.size ? (
					<div className={$.filters} aria-label='Jobs filtern'>
						<button
							type='button'
							aria-pressed={activeCategory === null}
							onClick={() => filterBy(null)}>
							Alle
						</button>
						{[...categories].map(([categoryId, categoryTitle]) => (
							<button
								key={categoryId}
								type='button'
								aria-pressed={activeCategory === categoryId}
								onClick={() => filterBy(categoryId)}>
								{categoryTitle}
							</button>
						))}
					</div>
				) : null}
				<div className={$.list}>
					{visibleJobs.map((job) => (
						<TransitionLink
							key={job.id ?? job.uri}
							href={job.uri ? pathFromCraftUri(job.uri) : '#'}
							transition='fade'
							className={$.job}>
							{job.hero[0] ? (
								<ImageCraft image={job.hero[0]} className={$.image} />
							) : null}
							<div>
								{job.jobCategories.length ? (
									<p className={$.categories}>
										{job.jobCategories.map((category) => category?.title).filter(Boolean).join(', ')}
									</p>
								) : null}
								<h3>{job.title}</h3>
								{job.introText ? <p>{job.introText}</p> : null}
							</div>
						</TransitionLink>
					))}
				</div>
				{pageCount > 1 ? (
					<nav className={$.pagination} aria-label='Jobs Seiten'>
						{Array.from({ length: pageCount }, (_, index) => index + 1).map(
							(pageNumber) => (
								<button
									key={pageNumber}
									type='button'
									aria-current={currentPage === pageNumber ? 'page' : undefined}
									onClick={() => setPage(pageNumber)}>
									{pageNumber}
								</button>
							)
						)}
					</nav>
				) : null}
			</Wrapper>
		</section>
	)
}
