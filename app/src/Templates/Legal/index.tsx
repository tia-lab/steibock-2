import { Wrapper } from '@/Components'
import { Footer } from '@/Sections/Footer'
import { EntryByUriQuery } from '@/queries'
import type { ResultOf } from 'gql.tada'
import $ from './style.module.scss'

type Entry = NonNullable<ResultOf<typeof EntryByUriQuery>['entry']>
type LegalEntry = Extract<Entry, { __typename: 'legalPage_Entry' }>

type Props = {
	entry: LegalEntry
}

export const LegalTemplate = ({ entry }: Props) => {
	return (
		<>
			<article>
				<Wrapper>
					<h1 className={$.title}>{entry.title}</h1>
					{entry.richText?.html ? (
						<div dangerouslySetInnerHTML={{ __html: entry.richText.html }} />
					) : null}
				</Wrapper>
			</article>
			<Footer />
		</>
	)
}
