import { craftQuery } from '@/lib/craft/client'
import { ServiceAreaIndexQuery } from '@/queries'

export const getServiceAreas = () =>
	craftQuery(
		ServiceAreaIndexQuery,
		{},
		{
			tags: ['craft', 'craft:entries', 'craft:section:pages'],
			revalidate: false
		}
	)
