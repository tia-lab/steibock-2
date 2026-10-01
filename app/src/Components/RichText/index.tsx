import type { HTMLAttributes } from 'react'

export interface RichTextProps extends HTMLAttributes<HTMLDivElement> {
	html?: string | null
}

export const RichText = ({ html, ...props }: RichTextProps) =>
	html ? (
		<div
			className='rich-text'
			// pi-lens-ignore: no-dangerously-set-innerhtml
			dangerouslySetInnerHTML={{ __html: html }}
			{...props}
		/>
	) : null
