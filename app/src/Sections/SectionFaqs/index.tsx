import { ContentSection, RichText } from '@/Components'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'

export const SectionFaqs = ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionFaqs_Entry') return null

	return (
		<ContentSection
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}>
			{data.title ? <h2>{data.title}</h2> : null}
			{data.accordions.map((item) =>
				item?.__typename === 'accordion_Entry' ? (
					<details key={item.id ?? item.title}>
						<summary>{item.title}</summary>
						<RichText html={item.richText?.html} />
					</details>
				) : null
			)}
		</ContentSection>
	)
}
