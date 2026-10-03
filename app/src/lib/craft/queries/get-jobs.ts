import { craftQuery } from '@/lib/craft/client'
import { JobsIndexQuery } from '@/queries'

export type JobsOrder = 'newest' | 'oldest' | 'titleAsc' | 'titleDesc'

const orderBy: Record<JobsOrder, string> = {
	newest: 'postDate DESC',
	oldest: 'postDate ASC',
	titleAsc: 'title ASC',
	titleDesc: 'title DESC'
}

export const getJobs = (limit = 24, order: JobsOrder = 'newest') =>
	craftQuery(
		JobsIndexQuery,
		{ limit, orderBy: orderBy[order] },
		{
			tags: ['craft', 'craft:jobs', 'craft:assets'],
			revalidate: false
		}
	)
