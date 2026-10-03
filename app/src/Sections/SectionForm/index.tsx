import { Form, RichText, Wrapper } from '@/Components'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

export const SectionForm = ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionForm_Entry') return null

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			className={$.section}>
			<Wrapper container>
				<div className={$.content}>
					<div className={$.intro}>
						<h2 className='text-cpt'>{data.title}</h2>
						<RichText html={data.richText?.html} />
					</div>
					<div className={$.form}>
						<Form data={data.form ?? null} />
					</div>
				</div>
			</Wrapper>
		</section>
	)
}
