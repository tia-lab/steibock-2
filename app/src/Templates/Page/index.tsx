import { SectionRouter } from '@/Sections'
import { Footer } from '@/Sections/Footer'
import { EntryByUriQuery } from '@/queries'
import type { ResultOf } from 'gql.tada'

type Entry = NonNullable<ResultOf<typeof EntryByUriQuery>['entry']>
type PageEntry = Extract<Entry, { __typename: 'page_Entry' }>

type Props = {
	entry: PageEntry
}

export const PageTemplate = ({ entry }: Props) => {
	return (
		<>
			<SectionRouter sections={entry.sections} />
			<Footer />
		</>
	)
}
