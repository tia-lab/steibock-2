import { craftQuery } from '@/lib/craft/client'
import { TeamIndexQuery } from '@/queries'

export type TeamOrder = 'newest' | 'oldest' | 'titleAsc' | 'titleDesc'

const teamOrderBy: Record<TeamOrder, string> = {
	newest: 'dateCreated DESC',
	oldest: 'dateCreated ASC',
	titleAsc: 'title ASC',
	titleDesc: 'title DESC'
}

export const getTeam = (limit = 100, order: TeamOrder = 'titleAsc') =>
	craftQuery(
		TeamIndexQuery,
		{ limit, orderBy: teamOrderBy[order] },
		{
			tags: ['craft', 'craft:team', 'craft:assets'],
			revalidate: false
		}
	)
