import { TransitionLink } from '@/Components/TransitionLink'
import { pathFromCraftUri } from '@/lib/craft/preview'

export interface NavigationItemData {
	__typename?: string
	id?: string | null
	title?: string | null
	typeHandle?: string | null
	externalUrl?: string | null
	openInNewTab?: boolean | null
	pageLink?: readonly ({ title?: string | null; uri?: string | null } | null)[] | null
	navigationChildren?: readonly (NavigationItemData | null)[] | null
}

interface NavigationItemsProps {
	items?: readonly (NavigationItemData | null)[] | null
	maxDepth?: number | string | null
	className?: string
	depth?: number
}

const boundedDepth = (value?: number | string | null) =>
	Math.min(4, Math.max(1, Math.trunc(Number(value) || 1)))

export const NavigationItems = ({
	items,
	maxDepth,
	className,
	depth = 1,
}: NavigationItemsProps) => {
	const limit = boundedDepth(maxDepth)

	if (!items?.length || depth > limit) {
		return null
	}

	return (
		<ul className={className} data-navigation-depth={depth}>
			{items.map((item) => {
				if (!item || item.__typename !== 'navigationItem_Entry') {
					return null
				}

				const page = item.pageLink?.[0]
				const href = item.externalUrl || (page?.uri ? pathFromCraftUri(page.uri) : null)
				if (!href) {
					return null
				}

				const label = item.title || page?.title || href
				const newTab = Boolean(item.openInNewTab)
				const link = item.externalUrl || newTab ? (
					<a href={href} target={newTab ? '_blank' : undefined} rel={newTab ? 'noreferrer' : undefined}>
						{label}
					</a>
				) : (
					<TransitionLink href={href} transition='fade'>
						{label}
					</TransitionLink>
				)

				return (
					<li key={item.id ?? href}>
						{link}
						<NavigationItems
							items={item.navigationChildren}
							maxDepth={limit}
							depth={depth + 1}
						/>
					</li>
				)
			})}
		</ul>
	)
}
