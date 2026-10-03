import { Button, Container, RichText, Wrapper } from '@/Components'
import { pathFromCraftUri } from '@/lib/craft/preview'
import { RenderableSectionFragment } from '@/queries'
import clsx from 'clsx'
import { readFragment } from 'gql.tada'
import { ArrowRight } from 'lucide-react'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

const buttonTarget = (target?: string | null) =>
	target === '_blank' ? '_blank' : '_self'

const renderTitle = (line: string) =>
	line.split(/(<b>.*?<\/b>)/gi).map((part, index) =>
		/^<b>.*<\/b>$/i.test(part) ? (
			<b key={index}>{part.slice(3, -4)}</b>
		) : (
			part
		)
	)

export const SectionHero = ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionHero_Entry') return null

	const buttonHref = data.button?.entry?.uri
		? pathFromCraftUri(data.button.entry.uri)
		: data.button?.url
	const calloutHref = data.calloutLink?.entry?.uri
		? pathFromCraftUri(data.calloutLink.entry.uri)
		: data.calloutLink?.url
	const titleLines = (data.heroTitle || data.title || '')
		.split(/\r?\n|<\/br>/i)
		.map((line) => line.trim())
		.filter(Boolean)

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			className={clsx($.section, { [$.home]: data.isHomePage })}>
			<Wrapper>
				<Container>
					<div className={$.title}>
						{titleLines.map((line, index) => (
							<h1 key={index}>{renderTitle(line)}</h1>
						))}
					</div>
					<div className={$.content}>
						{data.subtitle ? <p className='text-lead'>{data.subtitle}</p> : null}
						<RichText html={data.richText?.html} className={$.richText} />
						{buttonHref ? (
							<Button
								variant='text'
								className={$.button}
								href={buttonHref}
								nextJs={Boolean(data.button?.entry?.uri)}
								target={buttonTarget(data.button?.target)}
								icon={<ArrowRight />}>
								{data.button?.label ?? data.button?.defaultLabel ?? buttonHref}
							</Button>
						) : null}
					</div>
					{data.showCallout ? (
						<aside className={$.callout} aria-label={data.calloutTitle ?? 'Callout'}>
							{data.calloutTitle ? <h2 className='title-h4'>{data.calloutTitle}</h2> : null}
							{data.calloutSubtitle ? (
								<p className='text-lead'>{data.calloutSubtitle}</p>
							) : null}
							{calloutHref ? (
								<Button
									variant='text'
									className={$.button}
									href={calloutHref}
									nextJs={Boolean(data.calloutLink?.entry?.uri)}
									target={buttonTarget(data.calloutLink?.target)}
									icon={<ArrowRight />}>
									{data.calloutLink?.label ??
										data.calloutLink?.defaultLabel ??
										calloutHref}
								</Button>
							) : null}
						</aside>
					) : null}
				</Container>
			</Wrapper>
		</section>
	)
}
