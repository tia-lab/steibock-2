import { Anim, NavigationItems, Wrapper } from '@/Components'
import { getGlobals } from '@/lib/craft/queries'
import { LinkFragment, NavigationFragment } from '@/queries'
import { clsx } from 'clsx'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import $ from './style.module.scss'

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {}

type LinkEntry = FragmentOf<typeof LinkFragment>

const pathFromCraftUri = (uri?: string | null) => {
	if (!uri || uri === '__home__') {
		return '/'
	}

	return `/${uri}`
}

export const Footer = async ({ ...props }: FooterProps) => {
	const globals = await getGlobals()
	const footer = globals.footer

	if (footer?.__typename !== 'footer_GlobalSet') {
		return null
	}

	return (
		<footer className={clsx('section', $.footer)} {...props}>
			<Wrapper container>
				<Anim.div type='fade-up' className={$.content}>
					{footer.companyName ? <h2>{footer.companyName}</h2> : null}
					{footer.address ? <p>{footer.address}</p> : null}
					{footer.email ? (
						<a href={`mailto:${footer.email}`}>{footer.email}</a>
					) : null}
					{footer.phone ? <a href={`tel:${footer.phone}`}>{footer.phone}</a> : null}
					{footer.footerNavigation?.length ? (
						<div>
							{footer.footerNavigation.map((navigation) => {
								if (navigation?.__typename !== 'navigation_Entry') {
									return null
								}
								const navigationData = readFragment(
									NavigationFragment,
									navigation as FragmentOf<typeof NavigationFragment>,
								)

								return (
									<nav key={navigationData.id ?? navigationData.navigationHandle}>
										{navigationData.title ? <h3>{navigationData.title}</h3> : null}
										<NavigationItems
											items={navigationData.navigationItems}
											maxDepth={navigationData.maxDepth}
											className={$.navigationList}
										/>
									</nav>
								)
							})}
						</div>
					) : null}
					{footer.links?.length ? (
						<div>
							{footer.links.map((link) => {
								if (!link) {
									return null
								}

								const linkData = readFragment(LinkFragment, link as LinkEntry)
								const pageUri = linkData.pageLink[0]?.uri
								const href = linkData.externalUrl || pathFromCraftUri(pageUri)

								return (
									<a
										key={linkData.id ?? linkData.title}
										href={href}
										target={linkData.isExternal ? '_blank' : undefined}
										rel={linkData.isExternal ? 'noreferrer' : undefined}>
										{linkData.title}
									</a>
								)
							})}
						</div>
					) : null}
					{footer.socialLinks?.length ? (
						<div>
							{footer.socialLinks.map((link) => {
								if (!link?.externalUrl) {
									return null
								}

								return (
									<a
										key={link.id ?? link.externalUrl}
										href={link.externalUrl}
										target='_blank'
										rel='noreferrer'>
										{link.title}
									</a>
								)
							})}
						</div>
					) : null}
				</Anim.div>
			</Wrapper>
		</footer>
	)
}
