import { Button, ImageCraft, Wrapper } from '@/Components'
import { pathFromCraftUri } from '@/lib/craft/preview'
import {
	AssetImageFragment,
	RenderableSectionFragment
} from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

export const SectionServices = ({ section }: SectionComponentProps) => {
	const source = readFragment(RenderableSectionFragment, section)

	if (source.__typename !== 'sectionServices_Entry') {
		return null
	}

	const data = source
	const buttonHref = data.button?.entry?.uri
		? pathFromCraftUri(data.button.entry.uri)
		: data.button?.url

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			className={$.section}>
			<Wrapper>
				<div className={$.content}>
					<h2>{data.title}</h2>
					{buttonHref ? (
						<Button
							href={buttonHref}
							nextJs={Boolean(data.button?.entry?.uri)}
							target={data.button?.target === '_blank' ? '_blank' : '_self'}
							transition='fade'>
							{data.button?.label ?? data.button?.defaultLabel ?? buttonHref}
						</Button>
					) : null}
					<div className={$.list}>
						{data.accordions.map((item) => {
							if (!item || item.__typename !== 'accordion_Entry') return null

							const richText = item.richText?.html
								?.replace(/<[^>]*>/g, ' ')
								.replace(/\s+/g, ' ')
								.trim()

							return (
								<details key={item.id ?? item.title} className={$.item}>
									<summary>{item.title}</summary>
									<div className={$.answer}>
										{item.subtitle ? <p>{item.subtitle}</p> : null}
										{richText ? <p>{richText}</p> : null}
										{item.gallery.length ? (
											<div className={$.gallery}>
												{item.gallery.map((image, index) => {
													if (!image) return null

													const asset = readFragment(AssetImageFragment, image)

													return (
														<ImageCraft
															key={asset.id ?? index}
															image={image}
															className={$.image}
														/>
													)
												})}
											</div>
										) : null}
									</div>
								</details>
							)
						})}
					</div>
				</div>
			</Wrapper>
		</section>
	)
}
