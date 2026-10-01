import clsx from 'clsx'
import { Button, type ButtonProps } from '../Button'
import $ from './style.module.scss'

export interface ButtonIconProps extends ButtonProps {}

export const ButtonIcon = ({
	className,
	children,
	size = 'medium',
	...props
}: ButtonIconProps) => {
	return (
		<Button
			className={clsx(
				$.button,
				{
					[$.small]: size === 'small',
					[$.medium]: size === 'medium',
					[$.large]: size === 'large'
				},
				className
			)}
			size={size}
			{...props}>
			{children}
		</Button>
	)
}
