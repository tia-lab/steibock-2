import { Button, CardNews, Container, Wrapper } from '@/Components'
import type { CardNewsEntry } from '@/Components/CardNews'
import { getNews, type NewsOrder } from '@/lib/craft/queries'
import { RenderableSectionFragment } from '@/queries'
import clsx from 'clsx'
import { readFragment } from 'gql.tada'
import { ArrowRight } from 'lucide-react'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

const normalizeLimit = (value: unknown) => {
	const parsed = Number(value)

	return Number.isFinite(parsed) && parsed > 0 ? parsed : 4
}

const normalizeOrder = (value: unknown): NewsOrder => {
	if (
		value === 'oldest' ||
		value === 'titleAsc' ||
		value === 'titleDesc'
	) {
		return value
	}

	return 'newest'
}

const isNewsItem = (item: unknown): item is CardNewsEntry =>
	typeof item === 'object' &&
	item !== null &&
	(item as { __typename?: string }).__typename === 'news_Entry'

export const SectionNews = async ({ section }: SectionComponentProps) => {
	const data = readFragment(RenderableSectionFragment, section)

	if (data.__typename !== 'sectionNews_Entry') return null

	const limit = normalizeLimit(data.itemsLimit)
	const selectedNews = data.selectedNews?.filter(isNewsItem) ?? []
	const fallback = selectedNews.length
		? null
		: await getNews(limit, normalizeOrder(data.orderBy))
	const news = (
		selectedNews.length
			? selectedNews
			: (fallback?.entries?.filter(isNewsItem) ?? [])
	).slice(0, limit)

	if (!news.length) return null

	const leftNews = news.filter((_, index) => index % 2 !== 0)
	const rightNews = news.filter((_, index) => index % 2 === 0)
	const placeButtonLeft = news.length > 2 && news.length % 2 !== 0
	const moreNews = (
		<div className={$.button}>
			<Button href='/news' transition='fade'>
				Mehr News
				<ArrowRight aria-hidden='true' />
			</Button>
		</div>
	)

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			className={$.section}>
			<Wrapper>
				<Container>
					<div className={$.content}>
						<div className={$.column}>
							<div className={$.head}>
								{data.title ? <h2 className='text-caption'>{data.title}</h2> : null}
								{data.subtitle ? <p className='title-h4'>{data.subtitle}</p> : null}
							</div>
							{leftNews.map((item) => (
								<CardNews key={item.id ?? item.uri} entry={item} className={$.item} />
							))}
							{placeButtonLeft ? moreNews : null}
						</div>
						<div className={clsx($.column, $.column_right)}>
							{rightNews.map((item) => (
								<CardNews key={item.id ?? item.uri} entry={item} className={$.item} />
							))}
							{placeButtonLeft ? null : moreNews}
						</div>
					</div>
				</Container>
			</Wrapper>
		</section>
	)
}
