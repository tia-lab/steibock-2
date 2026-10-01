import { Container, TransitionLink, Wrapper } from '@/Components'
import { getServiceAreas } from '@/lib/craft/queries'
import { pathFromCraftUri } from '@/lib/craft/preview'
import { RenderableSectionFragment } from '@/queries'
import clsx from 'clsx'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

const formatIndex = (index: number) => String(index + 1).padStart(2, '0')
const splitTitle = (title: string) =>
	title.split('[').map((part, index) => (index === 0 ? part : `[${part}`))

export const SectionLinks = async ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionLinks_Entry') return null

	const result = await getServiceAreas()
	const entries = (result.entries ?? []).filter(
		(entry): entry is NonNullable<typeof entry> & { uri: string } =>
			entry?.__typename === 'serviceAreaPage_Entry' && typeof entry.uri === 'string'
	)

	if (!entries.length) return null

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			className={$.section}>
			<Wrapper>
				<Container>
					{data.title ? (
						<div className={$.title}>
							<h2 className='text-caption'>{data.title}</h2>
						</div>
					) : null}
					<div className={$.content}>
						{entries.map((entry, index) => (
							<TransitionLink
								key={entry.id}
								className={$.item}
								href={pathFromCraftUri(entry.uri)}
								transition='fade'>
								<div className='title-h5'>{formatIndex(index)}</div>
								<div className={$.item_title}>
									{splitTitle(entry.title ?? '').map((part, partIndex) => (
										<div
											key={`${part}-${partIndex}`}
											className={clsx(
												partIndex === 0
													? 'title-h2'
													: 'title-h4 text-style-uppercase'
											)}>
											{part}
										</div>
									))}
								</div>
							</TransitionLink>
						))}
					</div>
				</Container>
			</Wrapper>
		</section>
	)
}
