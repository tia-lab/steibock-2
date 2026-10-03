import { Button, ContentSection } from '@/Components'
import { normalizeCraftAssetUrl } from '@/lib/craft/assets'
import { pathFromCraftUri } from '@/lib/craft/preview'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

export const SectionDownloads = ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionDownloads_Entry') return null

	return (
		<ContentSection
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}>
			<div className={$.content}>
				{data.title ? <h2>{data.title}</h2> : null}
				<div className={$.list}>
					{data.downloads.map((item) => {
						if (!item || item.__typename !== 'download_Entry' || !item.button) {
							return null
						}

						const href = item.button.entry?.uri
							? pathFromCraftUri(item.button.entry.uri)
							: item.button.asset
								? normalizeCraftAssetUrl(item.button.url)
								: item.button.url

						if (!href) return null

						const downloadable = Boolean(item.button.asset || item.button.download)

						return (
							<Button
								key={item.id ?? href}
								href={href}
								nextJs={Boolean(item.button.entry?.uri) && !downloadable}
								target={item.button.target === '_blank' ? '_blank' : '_self'}
								download={downloadable ? (item.button.filename ?? true) : undefined}
								transition='fade'>
								{item.button.label ??
									item.button.defaultLabel ??
									item.button.asset?.title ??
									item.button.filename ??
									href}
							</Button>
						)
					})}
				</div>
			</div>
		</ContentSection>
	)
}
