import { ImageCraft, Wrapper } from '@/Components'
import { pathFromCraftUri } from '@/lib/craft/preview'
import { RenderableSectionFragment } from '@/queries'
import { readFragment } from 'gql.tada'
import type { SectionComponentProps } from '../SectionRouter'
import $ from './style.module.scss'

export const SectionProjects = ({ section }: SectionComponentProps) => {
	const source = readFragment(RenderableSectionFragment, section)

	if (source.__typename !== 'sectionProjects_Entry') {
		return null
	}

	const data = source
	const projects = data.selectedProjects.filter(
		(project) => project?.__typename === 'project_Entry'
	)

	return (
		<section
			data-section-id={data.id ?? undefined}
			data-section-type={data.typeHandle ?? undefined}
			data-items-limit={data.itemsLimit ?? undefined}
			data-items-per-page={data.itemsPerPage ?? undefined}
			data-order-by={data.orderBy ?? undefined}
			className={$.section}>
			<Wrapper>
				<div className={$.content}>
					<h2>{data.title}</h2>
					{data.subtitle ? <p>{data.subtitle}</p> : null}
					<ul className={$.list}>
						{projects.map((project) => {
							const href = project.uri ? pathFromCraftUri(project.uri) : null

							return (
								<li key={project.id ?? project.uri} className={$.item}>
									{project.image[0] ? (
										<ImageCraft image={project.image[0]} className={$.image} />
									) : null}
									<h3>{href ? <a href={href}>{project.title}</a> : project.title}</h3>
									{project.excerpt ? <p>{project.excerpt}</p> : null}
								</li>
							)
						})}
					</ul>
				</div>
			</Wrapper>
		</section>
	)
}
