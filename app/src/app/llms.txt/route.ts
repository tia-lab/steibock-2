import { getGlobals } from '@/lib/craft/queries'

type SeoLlmsGlobal = {
	siteName?: string | null
	siteDescription?: string | null
	llmsText?: string | null
}

const buildFallbackContent = (seo?: SeoLlmsGlobal | null) =>
	[
		`# ${seo?.siteName || 'Site'}`,
		'',
		seo?.siteDescription ? `> ${seo.siteDescription}` : null
	]
		.filter(Boolean)
		.join('\n')

export async function GET() {
	const globals = await getGlobals()
	const seo = globals.seo as SeoLlmsGlobal | null | undefined
	const content = seo?.llmsText?.trim() || buildFallbackContent(seo)

	return new Response(`${content}\n`, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-store'
		}
	})
}
