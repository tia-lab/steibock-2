import { ImageCraft, Slider, Wrapper } from '@/Components'
import { AssetImageFragment, RenderableSectionFragment } from '@/queries'
import clsx from 'clsx'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

export const SectionGallery = ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionGallery_Entry') return null

	const images = data.gallery.filter(Boolean)

	if (!images.length) return null

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}>
			<Wrapper fluid='full'>
				<Slider
					className='relative'
					classes={{ controls: $.controls }}
					controls={images.length > 1}
					options={{ loop: true }}>
					{images.map((image, index) => {
						const asset = readFragment(AssetImageFragment, image)

						if (!asset) return null

						return (
							<figure className={$.slide} key={asset.id ?? index}>
								<ImageCraft className={$.image} image={image} ratio='16:9' />
								{asset.title ? (
									<figcaption className={clsx('text-small', $.caption)}>
										{asset.title}
									</figcaption>
								) : null}
							</figure>
						)
					})}
				</Slider>
			</Wrapper>
		</section>
	)
}
