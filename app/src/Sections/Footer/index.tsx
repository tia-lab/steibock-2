import { Button, Logo, Wrapper } from '@/Components'
import { getGlobals } from '@/lib/craft/queries'
import { LinkFragment } from '@/queries'
import { clsx } from 'clsx'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import $ from './style.module.scss'

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {}

type LinkEntry = FragmentOf<typeof LinkFragment>

const splitText = (value: string | null) =>
	value?.split('</br>').map((part) => part.trim()) ?? []

export const Footer = async ({ ...props }: FooterProps) => {
	const globals = await getGlobals()
	const footer = globals.footer

	if (footer?.__typename !== 'footer_GlobalSet') {
		return null
	}

	return (
		<footer className={clsx('section', $.footer)} {...props}>
			<Wrapper container>
				<div className={$.logo}>
					<Logo variant='square' className={$.logo_square} />
					<Logo variant='text' className={$.logo_text} />
				</div>
			</Wrapper>
			<Wrapper container>
				<div className={$.row_2}>
					{footer.introtext ? (
						<p className={clsx('text-lead', $.introtext)}>{footer.introtext}</p>
					) : null}
					<div className={$.contact}>
						<div className={$.contact_col}>
							<p className='text-cpt'>Standort</p>
							{footer.companyName ? (
								<p className='text-small'>{footer.companyName}</p>
							) : null}
							{splitText(footer.address).map((line, index) => (
								<p className='text-small' key={index}>
									{line}
								</p>
							))}
						</div>
						<div>
							<p className='text-cpt'>Kontakt</p>
							{footer.email ? (
								<Button variant='text' href={`mailto:${footer.email}`}>
									<p className={clsx($.footer_link, 'text-small')}>{footer.email}</p>
								</Button>
							) : null}
							{footer.phone ? (
								<Button variant='text' href={`tel:${footer.phone}`}>
									<p className={clsx($.footer_link, 'text-small')}>{footer.phone}</p>
								</Button>
							) : null}
						</div>
					</div>
				</div>
			</Wrapper>
			<Wrapper container>
				<div className={$.row_3}>
					<p className={$.copy}>
						&copy; {new Date().getFullYear()} Steibock AG | Design und Konzept: UBIQ AG
					</p>
					{footer.links?.length ? (
						<div className={$.links}>
							{footer.links.map((link) => {
								if (!link) return null

								return (
									<Button
										key={readFragment(LinkFragment, link as LinkEntry).id}
										link={link as LinkEntry}
										variant='text'
										transition='fade'
									/>
								)
							})}
						</div>
					) : null}
				</div>
			</Wrapper>
		</footer>
	)
}
