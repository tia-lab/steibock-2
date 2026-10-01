// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- Wrangler generates global runtime and binding types.
/// <reference path="./worker-configuration.d.ts" />

import openNextWorker from './.open-next/worker.js'

export { DOQueueHandler } from './.open-next/worker.js'

const IMAGE_PATH = '/_next/image'
const IMAGE_CACHE_CONTROL = 'public, max-age=604800'
const IMAGE_CACHE_NAME = 'images'

const withImageCacheHeaders = (response: Response) => {
	const headers = new Headers(response.headers)
	headers.set('Cache-Control', IMAGE_CACHE_CONTROL)

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	})
}

export default {
	async fetch(request, env, ctx) {
		const isImageRequest =
			request.method === 'GET' && new URL(request.url).pathname === IMAGE_PATH

		if (!isImageRequest) {
			return openNextWorker.fetch(request, env, ctx)
		}

		const imageCache = await caches.open(IMAGE_CACHE_NAME)
		const cachedResponse = await imageCache.match(request)

		if (cachedResponse) {
			return cachedResponse
		}

		const response = await openNextWorker.fetch(request, env, ctx)

		if (!response.ok) {
			return response
		}

		const cacheableResponse = withImageCacheHeaders(response)
		ctx.waitUntil(imageCache.put(request, cacheableResponse.clone()))

		return cacheableResponse
	}
} satisfies ExportedHandler<CloudflareEnv>
