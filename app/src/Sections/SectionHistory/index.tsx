import { CardTeam, Container, Wrapper } from '@/Components'
import type { CardTeamEntry } from '@/Components/CardTeam'
import { getTeam } from '@/lib/craft/queries'
import { RenderableSectionFragment } from '@/queries'
import clsx from 'clsx'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

const isTeamMember = (entry: unknown): entry is CardTeamEntry =>
	typeof entry === 'object' &&
	entry !== null &&
	(entry as { __typename?: string }).__typename === 'person_Entry'

export const SectionHistory = async ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionHistory_Entry') return null

	const team = await getTeam(100, 'titleAsc')
	const people = team.entries?.filter(isTeamMember) ?? []

	if (!people.length) return null

	const columns = [0, 1, 2].map((columnIndex) =>
		people.filter((_, index) => index % 3 === columnIndex)
	)
	const titleLines = data.title
		? data.title.split('</br>').map((line) => line.trim())
		: []

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			className={$.section}>
			<Wrapper>
				<Container>
					<div className={$.title}>
						{titleLines.map((line, index) => (
							<h3 key={line} className={clsx(index !== 0 && 'font-weight-600')}>
								{line}
							</h3>
						))}
					</div>
					<div className={$.grid}>
						{columns.map((column, columnIndex) => (
							<div className={$.column} key={columnIndex}>
								{column.map((person) => (
									<CardTeam key={person.id ?? person.title} entry={person} />
								))}
							</div>
						))}
					</div>
				</Container>
			</Wrapper>
		</section>
	)
}
