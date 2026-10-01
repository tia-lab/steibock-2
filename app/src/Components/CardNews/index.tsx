import { pathFromCraftUri } from '@/lib/craft/preview'
import {
	NewsIndexQuery,
	RenderableSectionFragment
} from '@/queries'
import type { FragmentOf, ResultOf } from 'gql.tada'
import { ArrowRight } from 'lucide-react'
import { TransitionLink } from '../TransitionLink'
import { ImageCraft } from '../ImageCraft'
import clsx from 'clsx'
import $ from './style.module.scss'

type SectionNewsEntry = Extract<
	FragmentOf<typeof RenderableSectionFragment>,
	{ __typename?: 'sectionNews_Entry' }
>
type SelectedNewsItem = NonNullable<
	NonNullable<SectionNewsEntry['selectedNews']>[number]
>
type FallbackNewsItem = NonNullable<
	NonNullable<ResultOf<typeof NewsIndexQuery>['entries']>[number]
>
export type CardNewsEntry = Extract<
	SelectedNewsItem | FallbackNewsItem,
	{ __typename: 'news_Entry' }
>

interface CardNewsProps extends React.HTMLAttributes<HTMLElement> {
	entry: CardNewsEntry
}

export const CardNews = ({ entry, className }: CardNewsProps) => {
	const href = entry.uri ? pathFromCraftUri(entry.uri) : '#'
	const category = entry.newsKategorie?.[0]
	const date = entry.postDate
		? new Intl.DateTimeFormat('de-CH', {
				month: '2-digit',
				year: '2-digit'
			}).format(new Date(entry.postDate))
		: null

	return (
		<TransitionLink
			href={href}
			transition='fade'
			className={clsx($.card, className)}>
			{date || category?.title ? (
				<div className={$.head}>
					{date ? <div className={clsx('text-cpt', $.badge)}>{date}</div> : null}
					{category?.title ? (
						<div className={clsx('text-cpt', $.badge)}>{category.title}</div>
					) : null}
				</div>
			) : null}
			<div className={$.content}>
				<p className='title-h5'>{entry.title}</p>
				<span className={$.icon} aria-hidden='true'>
					<ArrowRight />
				</span>
			</div>
			{entry.image?.[0] ? (
				<div className={$.bg_image_wrap}>
					<ImageCraft image={entry.image[0]} className={$.bg_image} />
					<div className={$.bg_overlay} />
					<ImageCraft image={entry.image[0]} className={$.image} />
				</div>
			) : null}
		</TransitionLink>
	)
}
