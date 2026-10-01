import { Anim, Wrapper } from '@/Components'
import { Form } from '@/Components/Form'
import { RenderableSectionFragment } from '@/queries'
import clsx from 'clsx'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import { getSectionSpacingStyle } from '../utils/section-spacing'
import $ from './style.module.scss'

export const SectionContact = ({
	section,
	spacingOverride
}: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionContact_Entry') {
		return null
	}

	const spacingSource = spacingOverride?.customSpacing ? spacingOverride : data

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			style={getSectionSpacingStyle(spacingSource)}
			className={clsx('section', $.section)}>
			<Wrapper container>
				<div className={$.content}>
					<Anim.h2 type='fade-up'>{data.title}</Anim.h2>
					{data.text ? <Anim.p type='fade-up'>{data.text}</Anim.p> : null}
				</div>
				<Anim.div className={$.form} type='fade-up'>
					<Form data={data.form ?? null} />
				</Anim.div>
			</Wrapper>
		</section>
	)
}
