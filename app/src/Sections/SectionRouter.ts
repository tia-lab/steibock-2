import {
	createElement,
	Fragment,
	type ComponentType,
	type ReactElement
} from 'react'
import { RenderableSectionFragment, SectionFragment } from '@/queries'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import { SectionAccordions } from './SectionAccordions'
import { SectionFaqs } from './SectionFaqs'
import { SectionGallery } from './SectionGallery'
import { SectionHero } from './SectionHero'
import { SectionHistory } from './SectionHistory'
import { SectionImageText } from './SectionImageText'
import { SectionLinks } from './SectionLinks'
import { SectionNews } from './SectionNews'
import { SectionProjects } from './SectionProjects'
import { SectionTeam } from './SectionTeam'
import { SectionTeamCta } from './SectionTeamCta'
import { SectionVideo } from './SectionVideo'

type Section = FragmentOf<typeof SectionFragment>
export type RenderableSection = FragmentOf<typeof RenderableSectionFragment>

type Props = {
	sections?: ReadonlyArray<Section | null> | null
}

export type SectionComponentProps = {
	section: RenderableSection
}

type SectionComponent = ComponentType<SectionComponentProps>

const sectionComponents: Record<string, SectionComponent> = {
	sectionHero_Entry: SectionHero,
	sectionLinks_Entry: SectionLinks,
	sectionNews_Entry: SectionNews,
	sectionProjects_Entry: SectionProjects,
	sectionVideo_Entry: SectionVideo,
	sectionImageText_Entry: SectionImageText,
	sectionHistory_Entry: SectionHistory,
	sectionTeam_Entry: SectionTeam,
	sectionTeamCta_Entry: SectionTeamCta,
	sectionGallery_Entry: SectionGallery,
	sectionFaqs_Entry: SectionFaqs,
	sectionAccordions_Entry: SectionAccordions
}

const renderSection = (
	section: Section,
	index: number
): ReactElement | null => {
	const data = readFragment(SectionFragment, section)
	const renderable = readFragment(RenderableSectionFragment, data)
	const Component = sectionComponents[renderable.__typename]

	if (!Component) {
		return null
	}

	const key =
		'id' in renderable && renderable.id
			? renderable.id
			: `section-${index}`

	return createElement(Component, { key, section: data })
}

export const SectionRouter = ({ sections }: Props) => {
	const children = sections
		?.filter((section): section is Section => Boolean(section))
		.map(renderSection)
		.filter((section): section is ReactElement => Boolean(section))

	return createElement(Fragment, null, children)
}
