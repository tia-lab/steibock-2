import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

initOpenNextCloudflareForDev()

const projectRoot = dirname(fileURLToPath(import.meta.url))

const craftPreviewTokenParam = 'x-craft-preview-token'
const craftGraphqlEndpoint = process.env.CRAFT_GRAPHQL_ENDPOINT
const craftPrimaryUrl = process.env.CRAFT_PRIMARY_URL
const craftOrigin = craftGraphqlEndpoint
	? new URL(craftGraphqlEndpoint).origin
	: undefined
const craftPrimaryOrigin = craftPrimaryUrl
	? new URL(craftPrimaryUrl).origin
	: undefined
const imageRemotePatterns = [
	...new Set(
		[craftOrigin, craftPrimaryOrigin].filter(
			(origin): origin is string => Boolean(origin)
		)
	)
].map((origin) => new URL(`${origin}/**`))

const nextConfig: NextConfig = {
	async rewrites() {
		return {
			beforeFiles: [
				{
					source: '/:path*',
					has: [
						{
							type: 'query',
							key: craftPreviewTokenParam,
							value: '.+'
						}
					],
					destination: '/craft-preview/:path*'
				}
			],
			afterFiles: [],
			fallback: []
		}
	},
	async redirects() {
		return craftOrigin
			? [
					{
						source: '/admin',
						destination: `${craftOrigin}/admin`,
						permanent: false
					}
				]
			: []
	},
	turbopack: {
		root: projectRoot
	},
	experimental: {
		cpus: 1
	},
	logging: {
		fetches: {
			fullUrl: true,
			hmrRefreshes: true
		}
	},
	images: {
		remotePatterns: imageRemotePatterns,
		dangerouslyAllowLocalIP: true
	}
}

export default nextConfig
