import { CardTeam, Container, Wrapper } from '@/Components'
import type { CardTeamEntry } from '@/Components/CardTeam'
import { getTeam, type TeamOrder } from '@/lib/craft/queries'
import { RenderableSectionFragment } from '@/queries'
import clsx from 'clsx'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

const normalizeLimit = (value: unknown) => {
	const parsed = Number(value)

	return Number.isFinite(parsed) && parsed > 0 ? parsed : 100
}

const normalizeOrder = (value: unknown): TeamOrder => {
	if (
		value === 'newest' ||
		value === 'oldest' ||
		value === 'titleDesc'
	) {
		return value
	}

	return 'titleAsc'
}

const isTeamMember = (entry: unknown): entry is CardTeamEntry =>
	typeof entry === 'object' &&
	entry !== null &&
	(entry as { __typename?: string }).__typename === 'person_Entry'

export const SectionTeam = async ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionTeam_Entry') return null

	const limit = normalizeLimit(data.itemsLimit)
	const selectedTeam = data.selectedTeam?.filter(isTeamMember) ?? []
	const fallback = selectedTeam.length
		? null
		: await getTeam(limit, normalizeOrder(data.orderBy))
	const people = (
		selectedTeam.length
			? selectedTeam
			: (fallback?.entries?.filter(isTeamMember) ?? [])
	).slice(0, limit)

	if (!people.length) return null

	const variant = data.teamVariant === 'textList' ? 'textList' : 'list'
	const columnCount = variant === 'textList' ? 1 : 3
	const columns = Array.from({ length: columnCount }, (_, columnIndex) =>
		people.filter((_, index) => index % columnCount === columnIndex)
	)
	const titleLines = data.title
		? data.title.split('</br>').map((line) => line.trim())
		: []

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			data-items-limit={data.itemsLimit ?? undefined}
			data-items-per-page={data.itemsPerPage ?? undefined}
			data-order-by={data.orderBy ?? undefined}
			data-team-variant={variant}
			className={$.section}>
			<Wrapper>
				<Container>
					<div className={$.title}>
						{titleLines.map((line, index) => (
							<h3
								key={`${line}-${index}`}
								className={clsx(index !== 0 && 'font-weight-600')}>
								{line}
							</h3>
						))}
						{data.subtitle ? <p>{data.subtitle}</p> : null}
					</div>
					<div className={clsx($.grid, variant === 'textList' && $.text_list)}>
						{columns.map((column, columnIndex) => (
							<div className={$.column} key={columnIndex}>
								{column.map((person) => (
									<CardTeam key={person.id ?? person.title} entry={person} variant={variant} />
								))}
							</div>
						))}
					</div>
				</Container>
			</Wrapper>
		</section>
	)
}
