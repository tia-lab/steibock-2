import { graphql } from "@/lib/craft/graphql";
import { NavigationFragment } from './fragments/navigation'

export const NavigationQuery = graphql(
	`
		query Navigation($handle: [QueryArgument] = ["main"]) {
			entries(section: "navigations", navigationHandle: $handle, limit: 1) {
				__typename
				...NavigationFragment
			}
		}
	`,
	[NavigationFragment],
)
