import { getJobs, type JobsOrder } from '@/lib/craft/queries'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import { JobsList, type JobListItem } from './JobsList'

const positiveNumber = (value: unknown, fallback: number) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const normalizeOrder = (value: unknown): JobsOrder => {
	if (value === 'oldest' || value === 'titleAsc' || value === 'titleDesc') {
		return value
	}
	return 'newest'
}

const isJob = (item: unknown): item is JobListItem =>
	typeof item === 'object' &&
	item !== null &&
	(item as { __typename?: string }).__typename === 'job_Entry'

export const SectionJobs = async ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)
	if (data.__typename !== 'sectionJobs_Entry') return null

	const limit = positiveNumber(data.itemsLimit, 6)
	const selected = data.selectedJobs?.filter(isJob) ?? []
	const fallback = selected.length
		? null
		: await getJobs(limit, normalizeOrder(data.orderBy))
	const jobs = (selected.length ? selected : fallback?.entries?.filter(isJob) ?? []).slice(
		0,
		limit
	)

	if (!jobs.length) return null

	return (
		<JobsList
			id={data.id}
			typeHandle={data.typeHandle}
			title={data.title}
			subtitle={data.subtitle}
			jobs={jobs}
			showCategoryFilters={Boolean(data.showCategoryFilters)}
			itemsPerPage={positiveNumber(data.itemsPerPage, 6)}
		/>
	)
}
