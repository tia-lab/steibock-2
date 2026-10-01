import localFont from 'next/font/local'

const primary = localFont({
	src: [
		{
			path: './obvia-normal-100.woff2',
			weight: '100',
			style: 'normal'
		},
		{
			path: './obvia-normal-300.woff2',
			weight: '300',
			style: 'normal'
		},
		{
			path: './obvia-normal-400.woff2',
			weight: '400',
			style: 'normal'
		},
		{
			path: './obvia-italic-400.woff2',
			weight: '400',
			style: 'italic'
		},
		{
			path: './obvia-normal-500.woff2',
			weight: '500',
			style: 'normal'
		},
		{
			path: './obvia-normal-600.woff2',
			weight: '600',
			style: 'normal'
		},
		{
			path: './obvia-normal-800.woff2',
			weight: '800',
			style: 'normal'
		},
		{
			path: './obvia-italic-800.woff2',
			weight: '800',
			style: 'italic'
		}
	],
	variable: '--font-primary',
	fallback: ['Arial', 'sans-serif'],
	display: 'swap',
	preload: true
})

const secondary = primary

export const fonts = {
	primary,
	secondary
}
