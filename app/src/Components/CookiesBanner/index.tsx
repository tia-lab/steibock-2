import { getGlobals } from '@/lib/craft/queries'
import { pathFromCraftUri } from '@/lib/craft/preview'
import { LinkFragment } from '@/queries'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import {
	CookiesBannerClient,
	type CookiesBannerLink
} from './index.client'

type Link = FragmentOf<typeof LinkFragment>

const normalizeTarget = (target?: string | null): CookiesBannerLink['target'] => {
	return target === 'blank' || target === '_blank' ? '_blank' : '_self'
}

const normalizeLink = (link: Link | null): CookiesBannerLink | null => {
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
		id: data.id ?? href,
		label: data.title ?? href,
		href,
		target: normalizeTarget(data.linkTarget),
		isExternal: Boolean(data.isExternal)
	}
}

const normalizeRetentionDays = (value: unknown) => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}

	if (typeof value === 'string') {
		const parsed = Number(value)

		return Number.isFinite(parsed) ? parsed : null
	}

	return null
}

export const CookiesBanner = async () => {
	const globals = await getGlobals()
	const legal = globals.legal

	if (legal?.__typename !== 'legal_GlobalSet') {
		return null
	}

	return (
		<CookiesBannerClient
			data={{
				title: legal.cookieTitle,
				html: legal.richText?.html,
				consentLabel: legal.cookieConsentLabel,
				declineLabel: legal.cookieDeclineLabel,
				acceptLabel: legal.cookieAcceptLabel,
				retentionDays: normalizeRetentionDays(legal.cookieRetentionDays),
				links: legal.links?.map(normalizeLink).filter((link) => link !== null)
			}}
		/>
	)
}
