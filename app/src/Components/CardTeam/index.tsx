import {
	RenderableSectionFragment,
	TeamIndexQuery
} from '@/queries'
import clsx from 'clsx'
import type { FragmentOf, ResultOf } from 'gql.tada'
import { MailIcon, PhoneIcon } from 'lucide-react'
import { ButtonIcon } from '../ButtonIcon'
import { ImageCraft } from '../ImageCraft'
import $ from './style.module.scss'

type SectionTeamEntry = Extract<
	FragmentOf<typeof RenderableSectionFragment>,
	{ __typename?: 'sectionTeam_Entry' }
>
type SelectedTeamItem = NonNullable<
	NonNullable<SectionTeamEntry['selectedTeam']>[number]
>
type FallbackTeamItem = NonNullable<
	NonNullable<ResultOf<typeof TeamIndexQuery>['entries']>[number]
>
export type CardTeamEntry = Extract<
	SelectedTeamItem | FallbackTeamItem,
	{ __typename: 'person_Entry' }
>

interface CardTeamProps extends React.HTMLAttributes<HTMLElement> {
	entry: CardTeamEntry
	variant?: 'list' | 'textList'
}

export const CardTeam = ({ entry, className, variant = 'list' }: CardTeamProps) => {
	const name =
		[entry.firstName, entry.lastName].filter(Boolean).join(' ') || entry.title

	return (
		<article className={clsx($.card, className)} data-variant={variant}>
			{variant === 'list' && entry.image?.[0] ? (
				<div className={$.image_wrap}>
					<ImageCraft image={entry.image[0]} className={$.image} ratio='1:1' />
					<div className={$.image_overlay} />
				</div>
			) : null}
			<div className={$.content}>
				{entry.role ? <p className='text-cpt'>{entry.role}</p> : null}
				<p className='title-h5'>{name}</p>
			</div>
			<div className={$.contact}>
				{entry.email ? (
					<ButtonIcon
						href={`mailto:${entry.email}`}
						nextJs={false}
						aria-label={`Email ${name}`}>
						<MailIcon />
					</ButtonIcon>
				) : null}
				{entry.phone ? (
					<ButtonIcon
						href={`tel:${entry.phone}`}
						nextJs={false}
						aria-label={`Call ${name}`}>
						<PhoneIcon />
					</ButtonIcon>
				) : null}
			</div>
		</article>
	)
}
