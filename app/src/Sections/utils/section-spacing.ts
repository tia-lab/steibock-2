import type { CSSProperties } from 'react'

export type SectionSpacingSource = {
	customSpacing?: boolean | null
	spaceTop?: string | null
	spaceBottom?: string | null
}

type SectionSpacingStyle = CSSProperties & {
	'--section-space-top'?: string
	'--section-space-bottom'?: string
}

const spacingValuePattern = /^[0-9]+$/

const getSectionSpaceVar = (value?: string | null) => {
	if (!value || !spacingValuePattern.test(value)) {
		return undefined
	}

	return `var(--space-section${value})`
}

export const getSectionSpacingStyle = (
	section?: SectionSpacingSource | null
): SectionSpacingStyle | undefined => {
	if (!section?.customSpacing) {
		return undefined
	}

	const style: SectionSpacingStyle = {}
	const spaceTop = getSectionSpaceVar(section.spaceTop)
	const spaceBottom = getSectionSpaceVar(section.spaceBottom)

	if (spaceTop) {
		style['--section-space-top'] = spaceTop
	}

	if (spaceBottom) {
		style['--section-space-bottom'] = spaceBottom
	}

	return Object.keys(style).length ? style : undefined
}
