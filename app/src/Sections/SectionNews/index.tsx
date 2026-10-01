import { Anim, ImageCraft, TransitionLink, Wrapper } from '@/Components'
import { getNews, type NewsOrder } from '@/lib/craft/queries'
import { NewsIndexQuery, RenderableSectionFragment } from '@/queries'
import type { FragmentOf, ResultOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import { getSectionSpacingStyle } from '../utils/section-spacing'
import { NewsSlider } from './NewsSlider.client'
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
type NewsItemSource = SelectedNewsItem | FallbackNewsItem
type NewsItem = Extract<NewsItemSource, { __typename: 'news_Entry' }>

const normalizeLimit = (value: unknown) => {
	const parsed = Number(value)

	return Number.isFinite(parsed) && parsed > 0 ? parsed : 12
}

const normalizeOrder = (value: unknown): NewsOrder => {
	return value === 'oldest' ? 'oldest' : 'newest'
}

const isNewsItem = (item: unknown): item is NewsItem => {
	return (
		typeof item === 'object' &&
		item !== null &&
		(item as { __typename?: string }).__typename === 'news_Entry'
	)
}

const NewsArticle = ({
	item,
	variant
}: {
	item: NewsItem
	variant?: string | null
}) => (
	<TransitionLink
		href={item.uri ?? '#'}
		transition='fade'
		className={$.article_link}>
		<Anim.article
			type={variant === 'slider' ? 'fade' : 'fade-up'}
			key={item.id ?? item.uri}
			className={$.article}>
			{item.image?.[0] ? (
				<div className={$.image_wrapper}>
					<ImageCraft image={item.image[0]} className='object-fit' />
				</div>
			) : null}

			<h3>{item.title}</h3>
			<div>
				{item.postDate ? (
					<time className='text-2 font-secondary text-secondary-60'>
						{item.postDate}
					</time>
				) : null}
				{item.excerpt ? <p>{item.excerpt}</p> : null}
			</div>
		</Anim.article>
	</TransitionLink>
)

const NewsList = ({
	items,
	variant
}: {
	items: NewsItem[]
	variant?: string | null
}) => {
	const articles = items.map((item) => (
		<NewsArticle key={item.id ?? item.uri} item={item} variant={variant} />
	))

	if (variant === 'slider') {
		return <NewsSlider>{articles}</NewsSlider>
	}

	return <div className={$.grid}>{articles}</div>
}

const SectionNewsFallback = async ({
	limit,
	order,
	variant
}: {
	limit: number
	order: NewsOrder
	variant?: string | null
}) => {
	const data = await getNews(limit, order)
	const items = (data.entries?.filter(isNewsItem) ?? []) as NewsItem[]

	return <NewsList items={items} variant={variant} />
}

export const SectionNews = ({
	section,
	spacingOverride
}: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionNews_Entry') {
		return null
	}

	const spacingSource = spacingOverride?.customSpacing ? spacingOverride : data
	const selectedNews = (data.selectedNews?.filter(isNewsItem) ??
		[]) as NewsItem[]

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			data-news-variant={data.newsVariant ?? undefined}
			style={getSectionSpacingStyle(spacingSource)}
			className={$.section}>
			<Wrapper fluid={data.newsVariant === 'slider' ? 'right' : undefined}>
				<Anim.h2 className='mb-md'>{data.title}</Anim.h2>
				{selectedNews.length ? (
					<NewsList items={selectedNews} variant={data.newsVariant} />
				) : (
					<SectionNewsFallback
						limit={normalizeLimit(data.itemsLimit)}
						order={normalizeOrder(data.orderBy)}
						variant={data.newsVariant}
					/>
				)}
			</Wrapper>
		</section>
	)
}
