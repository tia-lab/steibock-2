import clsx from 'clsx'
import { Wrapper } from '../Wrapper'
import $ from './style.module.scss'

export const ContentSection = ({
	children,
	className,
	...props
}: React.HTMLAttributes<HTMLElement>) => (
	<section className={clsx($.section, className)} {...props}>
		<Wrapper>{children}</Wrapper>
	</section>
)
