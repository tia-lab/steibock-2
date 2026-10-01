import { config } from '$/config'
import { Anim, ImageCraft, Wrapper } from '@/Components'
import { Footer } from '@/Sections/Footer'
import { EntryByUriQuery } from '@/queries'
import clsx from 'clsx'
import type { ResultOf } from 'gql.tada'
import $ from './style.module.scss'

type Entry = NonNullable<ResultOf<typeof EntryByUriQuery>['entry']>
type NewsEntry = Extract<Entry, { __typename: 'news_Entry' }>

type Props = {
	entry: NewsEntry
}

export const NewsTemplate = ({ entry }: Props) => {
	const image = entry.image[0] ?? null

	return (
		<>
			<section className={$.section}>
				<Wrapper container>
					<div className={$.content}>
						<Anim.h1 type='fade-up' className={$.title}>
							{entry.title}
						</Anim.h1>
						{entry.excerpt ? (
							<Anim.p type='fade-up' vars={{ delay: config.animation.short / 1.5 }}>
								{entry.excerpt}
							</Anim.p>
						) : null}
						<Anim.div type='fade-up' vars={{ delay: config.animation.short }}>
							<ImageCraft image={image} sizes='100vw' />
						</Anim.div>
						{entry.richText?.html ? (
							<Anim.div
								type='fade-up'
								dangerouslySetInnerHTML={{ __html: entry.richText.html }}
								className={clsx('rich-text', $.text)}
							/>
						) : null}
					</div>
				</Wrapper>
			</section>

			<Footer />
		</>
	)
}
