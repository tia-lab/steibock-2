import { Anim, Container, ImageCraft, Wrapper } from '@/Components'
import { RenderableSectionFragment } from '@/queries'
import clsx from 'clsx'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import {
	getSectionSpacingStyle,
	type SectionSpacingSource
} from '../utils/section-spacing'
import $ from './style.module.scss'

interface SectionAboutProps extends React.HTMLAttributes<HTMLElement> {
	section?: FragmentOf<typeof RenderableSectionFragment> | null
	spacingOverride?: SectionSpacingSource | null
}

export const SectionAbout = ({
	section,
	spacingOverride,
	style,
	...props
}: SectionAboutProps) => {
	const data = section ? readFragment(RenderableSectionFragment, section) : null

	if (data?.__typename !== 'sectionAbout_Entry') {
		return null
	}

	const imageRef = data.image[0] ?? null

	const spacingSource = spacingOverride?.customSpacing ? spacingOverride : data
	const spacingStyle = getSectionSpacingStyle(spacingSource)
	const sectionStyle =
		spacingStyle || style ? { ...spacingStyle, ...style } : undefined

	const variant = data.aboutVariant || 'full'

	const sectionClass = clsx($.section, {
		[$[variant]]: variant
	})

	return (
		<section className={sectionClass} style={sectionStyle} {...props}>
			<Wrapper>
				<Container>
					<div className={$.content}>
						<Anim.h2
							type='fade-up'
							className={clsx($.title, variant === 'full' && 'title-jumbo')}>
							{data.title}
						</Anim.h2>
						<Anim.p type='fade-up' className={$.description}>
							{data.text}
						</Anim.p>
					</div>
					{variant !== 'full' && imageRef ? (
						<Anim.div type='fade' className={$.image_wrapper}>
							<ImageCraft
								image={imageRef}
								className={$.image}
								sizes='100vw'
								loading='eager'
								fetchPriority='high'
							/>
						</Anim.div>
					) : null}
				</Container>
			</Wrapper>
			{variant === 'full' && imageRef ? (
				<div className={$.image_wrapper}>
					<ImageCraft
						image={imageRef}
						className={$.image}
						sizes='100vw'
						loading='eager'
						fetchPriority='high'
					/>
					<div className={$.image_overlay} />
				</div>
			) : null}
		</section>
	)
}
