import { NavigationItems, SwitchTheme, Wrapper } from '@/Components'
import { getNavigation } from '@/lib/craft/queries'
import { NavigationFragment } from '@/queries'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import { HeaderHideOnScroll } from './HeaderHideOnScroll'
import $ from './style.module.scss'

export const Header = async () => {
	const data = await getNavigation('main')
	const navigation = data.entries?.[0]
	if (navigation?.__typename !== 'navigation_Entry') {
		return null
	}
	const navigationData = readFragment(
		NavigationFragment,
		navigation as FragmentOf<typeof NavigationFragment>,
	)

	return (
		<header className={$.header} data-header>
			<HeaderHideOnScroll />
			<Wrapper>
				<nav className={$.nav}>
					<NavigationItems
						items={navigationData.navigationItems}
						maxDepth={navigationData.maxDepth}
						className={$.navigationList}
					/>
					<SwitchTheme />
				</nav>
			</Wrapper>
		</header>
	)
}
