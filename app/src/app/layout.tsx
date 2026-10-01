import { CookiesBanner, Layout } from '@/Components'
import { config } from '$/config'
import { generateGlobalMetadata } from '@/lib/craft/metadata'
import { fonts } from '@/lib/fonts'
import { Header } from '@/Sections/Header'
import type { Metadata } from 'next'
import '../styles/globals.scss'

export const generateMetadata = async (): Promise<Metadata> => {
	return generateGlobalMetadata()
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			lang='en'
			className={`${fonts.primary.variable} ${fonts.secondary.variable}`}>
			<body data-theme={config.theme.default}>
				<Layout wrapper={false}>
					<Header />
					<main data-page-transition-content>{children}</main>
					{config.cookies.enabled ? <CookiesBanner /> : null}
				</Layout>
			</body>
		</html>
	)
}
