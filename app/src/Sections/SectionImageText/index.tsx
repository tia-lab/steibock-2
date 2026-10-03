import { ButtonIcon, ImageCraft, RichText, Wrapper } from '@/Components'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import { ArrowRight } from 'lucide-react'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

export const SectionImageText = ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionImageText_Entry') return null

	const image = data.image[0] ?? null
	const target = data.button?.target === '_blank' ? '_blank' : '_self'
	const external = data.button?.url
		? /^https?:\/\//.test(data.button.url) || target === '_blank'
		: false

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			data-image-position={data.imagePosition ?? undefined}
			className={$.section}>
			<Wrapper container>
				<div className={$.content}>
					<div className={$.text}>
						<div className={$.head}>
							{data.title ? <h2 className='text-cpt'>{data.title}</h2> : null}
							{data.subtitle ? (
								<p className='title-h4 font-weight-200'>{data.subtitle}</p>
							) : null}
						</div>
						<RichText html={data.richText?.html} />
						{data.button?.url ? (
							<ButtonIcon
								className={$.button}
								href={data.button.url}
								nextJs={!external}
								target={target}
								transition='fade'
								aria-label={data.button.label ?? 'Open link'}>
								<ArrowRight />
							</ButtonIcon>
						) : null}
					</div>
					{image ? (
						<div className={$.image_wrap}>
							<ImageCraft image={image} className={$.image_bg} ratio='1:1' />
							<div className={$.blur_bg} />
							<ImageCraft image={image} className={$.image} ratio='16:9' />
						</div>
					) : null}
				</div>
			</Wrapper>
		</section>
	)
}
