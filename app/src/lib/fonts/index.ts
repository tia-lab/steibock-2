import { IBM_Plex_Mono } from 'next/font/google'
import localFont from 'next/font/local'

const primary = localFont({
	src: [
		{
			path: './SuisseIntl-Light-WebS.woff2',
			weight: '300'
		},
		{
			path: './SuisseIntl-Regular-WebS.woff2',
			weight: '400'
		},
		{
			path: './SuisseIntl-Medium-WebS.woff2',
			weight: '500'
		}
	],
	variable: '--font-primary',
	fallback: ['Arial', 'sans-serif'],
	display: 'swap',
	preload: true
})

const secondary = IBM_Plex_Mono({
	variable: '--font-mono',
	subsets: ['latin'],
	weight: ['400', '500'],
	preload: true,
	fallback: ['Arial', 'sans-serif'],
	display: 'swap'
})

export const fonts = {
	primary,
	secondary
}
