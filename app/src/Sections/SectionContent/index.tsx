import { Anim, Button, Wrapper } from '@/Components'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import { getSectionSpacingStyle } from '../utils/section-spacing'
import $ from './style.module.scss'

export const SectionContent = ({
	section,
	spacingOverride
}: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionContent_Entry') {
		return null
	}

	const spacingSource = spacingOverride?.customSpacing ? spacingOverride : data

	return (
		<section
			data-section-id={data.id ?? undefined}
			className={$.section}
			style={getSectionSpacingStyle(spacingSource)}>
			<Wrapper container>
				<div className={$.content}>
					<Anim.h2 type='fade-up'>{data.title}</Anim.h2>
					{data.richText?.html ? (
						<Anim.div
							type='fade-up'
							dangerouslySetInnerHTML={{ __html: data.richText.html }}
							className='rich-text'
						/>
					) : null}
					{data.links?.length ? (
						<Anim.div type='fade-up' className={$.links}>
							{data.links.map((link, index) => {
								if (!link) {
									return null
								}
								return <Button key={index} link={link} />
							})}
						</Anim.div>
					) : null}
				</div>
			</Wrapper>
		</section>
	)
}
