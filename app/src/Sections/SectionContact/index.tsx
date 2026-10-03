import { Wrapper } from '@/Components'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

export const SectionContact = ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionContact_Entry') return null

	const phoneHref = data.phone?.replace(/[^+\d]/g, '')
	const mapUrl = data.mapLink?.url
	const mapTarget = data.mapLink?.target === '_blank' ? '_blank' : undefined
	const address = <address className={$.address}>{data.address}</address>

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			className={$.section}>
			<Wrapper container>
				<div className={$.content}>
					<div className={$.block}>
						<h2 className='text-cpt'>{data.title}</h2>
						<div className={$.contact}>
							{data.email ? (
								<a href={`mailto:${data.email}`}>{data.email}</a>
							) : null}
							{data.phone ? <a href={`tel:${phoneHref}`}>T {data.phone}</a> : null}
						</div>
					</div>
					{data.address ? (
						<div className={$.block}>
							<h3 className='text-cpt'>{data.subtitle ?? 'Standort'}</h3>
							{mapUrl ? (
								<a
									className={$.map}
									href={mapUrl}
									target={mapTarget}
									rel={mapTarget ? 'noreferrer' : undefined}>
									{address}
								</a>
							) : (
								address
							)}
						</div>
					) : null}
				</div>
			</Wrapper>
		</section>
	)
}
