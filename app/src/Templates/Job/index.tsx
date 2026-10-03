import { Button, ImageCraft, RichText, Wrapper } from '@/Components'
import { pathFromCraftUri } from '@/lib/craft/preview'
import { EntryByUriQuery } from '@/queries'
import { Footer } from '@/Sections/Footer'
import type { ResultOf } from 'gql.tada'
import $ from './style.module.scss'

type Entry = NonNullable<ResultOf<typeof EntryByUriQuery>['entry']>
type JobEntry = Extract<Entry, { __typename: 'job_Entry' }>

const hrefFromLink = (link: JobEntry['button'] | JobEntry['whatsApp']) =>
	link?.entry?.uri ? pathFromCraftUri(link.entry.uri) : link?.url

export const JobTemplate = ({ entry }: { entry: JobEntry }) => {
	const hero = entry.hero[0] ?? null
	const buttonHref = hrefFromLink(entry.button)
	const whatsAppHref = hrefFromLink(entry.whatsApp)

	return (
		<>
			<main className={$.section}>
				<Wrapper container>
					<div className={$.content}>
						{entry.jobCategories.length ? (
							<p className={$.categories}>
								{entry.jobCategories
									.map((category) => category?.title)
									.filter(Boolean)
									.join(', ')}
							</p>
						) : null}
						<h1>{entry.title}</h1>
						{entry.introText ? <p className={$.intro}>{entry.introText}</p> : null}
						{hero ? <ImageCraft image={hero} sizes='100vw' className={$.hero} /> : null}
						<RichText html={entry.richText?.html} />
						<div className={$.actions}>
							{buttonHref ? (
								<Button
									href={buttonHref}
									nextJs={Boolean(entry.button?.entry?.uri)}
									target={entry.button?.target === '_blank' ? '_blank' : '_self'}
									transition='fade'>
									{entry.button?.label ?? entry.button?.defaultLabel ?? buttonHref}
								</Button>
							) : null}
							{whatsAppHref ? (
								<Button
									href={whatsAppHref}
									nextJs={Boolean(entry.whatsApp?.entry?.uri)}
									target={entry.whatsApp?.target === '_blank' ? '_blank' : '_self'}>
									{entry.whatsApp?.label ?? entry.whatsApp?.defaultLabel ?? 'WhatsApp'}
								</Button>
							) : null}
						</div>
						{entry.contactPerson.length ? (
							<div className={$.contacts}>
								<h2>Ansprechpartner</h2>
								{entry.contactPerson.map((person) =>
									person?.__typename === 'person_Entry' ? (
										<article key={person.id} className={$.contact}>
											{person.image[0] ? (
												<ImageCraft image={person.image[0]} className={$.portrait} />
											) : null}
											<div>
												<h3>{[person.firstName, person.lastName].filter(Boolean).join(' ')}</h3>
												{person.role ? <p>{person.role}</p> : null}
												{person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : null}
												{person.phone ? <a href={`tel:${person.phone}`}>{person.phone}</a> : null}
											</div>
										</article>
									) : null
								)}
							</div>
						) : null}
					</div>
				</Wrapper>
			</main>
			<Footer />
		</>
	)
}
