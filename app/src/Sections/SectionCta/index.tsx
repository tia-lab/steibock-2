import { Anim, Button } from '@/Components'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import { getSectionSpacingStyle } from '../utils/section-spacing'
import $ from './style.module.scss'

export const SectionCta = ({
	section,
	spacingOverride
}: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionCta_Entry') {
		return null
	}

	const spacingSource = spacingOverride?.customSpacing ? spacingOverride : data

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			style={getSectionSpacingStyle(spacingSource)}
			className={$.section}>
			<div className={$.content}>
				<Anim.h2 type='fade-up' className='title-jumbo'>
					{data.title}
				</Anim.h2>
				{data.text ? (
					<Anim.p type='fade-up' className='title-h3'>
						{data.text}
					</Anim.p>
				) : null}
				{data.links?.length ? (
					<div>
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
				) : null}
			</div>
		</section>
	)
}
