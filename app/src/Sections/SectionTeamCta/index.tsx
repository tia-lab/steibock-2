import { Wrapper } from '@/Components'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

export const SectionTeamCta = ({ section }: SectionComponentProps) => {
	const source = readFragment(RenderableSectionFragment, section)

	if (source.__typename !== 'sectionTeamCta_Entry') {
		return null
	}

	const data = source

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			className={$.section}>
			<Wrapper>
				<div className={$.content}>
					{data.caption ? <p>{data.caption}</p> : null}
					<h2>{data.title}</h2>
					{data.subtitle ? <p>{data.subtitle}</p> : null}
				</div>
			</Wrapper>
		</section>
	)
}
