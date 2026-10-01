import { pathFromCraftUri } from '@/lib/craft/preview'
import { getGlobals } from '@/lib/craft/queries'
import { LinkFragment } from '@/queries'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import Link from 'next/link'
import $ from './not-found.module.scss'

type LinkEntry = FragmentOf<typeof LinkFragment>

const normalizeLink = (link: LinkEntry | null) => {
	if (!link) {
		return null
	}

	const data = readFragment(LinkFragment, link)
	const page = data.pageLink?.[0]
	const href = data.isExternal
		? data.externalUrl
		: page?.uri
			? pathFromCraftUri(page.uri)
			: null

	if (!href) {
		return null
	}

	return {
		href,
		label: data.title ?? href,
		target: data.linkTarget === 'blank' ? '_blank' : undefined,
		rel: data.linkTarget === 'blank' ? 'noreferrer' : undefined
	}
}

export default async function NotFound() {
	const globals = await getGlobals().catch(() => null)
	const errorPage = globals?.errorPage
	const link =
		errorPage?.__typename === 'errorPage_GlobalSet'
			? normalizeLink(errorPage.links?.[0] ?? null)
			: null

	const title =
		errorPage?.__typename === 'errorPage_GlobalSet'
			? errorPage.errorPageTitle
			: null
	const text =
		errorPage?.__typename === 'errorPage_GlobalSet' ? errorPage.text : null

	return (
		<section className={$.not_found}>
			<div className={$.content}>
				<h1 className={$.title}>{title || 'Page not found'}</h1>
				{text ? <p className={$.text}>{text}</p> : null}
				<Link
					className={$.link}
					href={link?.href ?? '/'}
					rel={link?.rel}
					target={link?.target}>
					{link?.label ?? 'Back home'}
				</Link>
			</div>
		</section>
	)
}
