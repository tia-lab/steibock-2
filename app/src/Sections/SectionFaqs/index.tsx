import { Button, ContentSection, RichText } from '@/Components'
import { pathFromCraftUri } from '@/lib/craft/preview'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'

export const SectionFaqs = ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionFaqs_Entry') return null

	const buttonHref = data.button?.entry?.uri
		? pathFromCraftUri(data.button.entry.uri)
		: data.button?.url

	return (
		<ContentSection
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}>
			{data.title ? <h2>{data.title}</h2> : null}
			{buttonHref ? (
				<Button
					href={buttonHref}
					nextJs={Boolean(data.button?.entry?.uri)}
					target={data.button?.target === '_blank' ? '_blank' : '_self'}
					transition='fade'>
					{data.button?.label ?? data.button?.defaultLabel ?? buttonHref}
				</Button>
			) : null}
			{data.faqs.map((item) =>
				item?.__typename === 'faq_Entry' ? (
					<details key={item.id ?? item.title}>
						<summary>{item.title}</summary>
						<RichText html={item.richText?.html} />
					</details>
				) : null
			)}
		</ContentSection>
	)
}
