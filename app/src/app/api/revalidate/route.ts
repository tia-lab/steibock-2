import { revalidateTag } from 'next/cache'

type RevalidatePayload = {
	secret?: unknown
	tags?: unknown
}

const secret = process.env.REVALIDATE_SECRET

const normalizeTags = (tags: unknown) => {
	if (!Array.isArray(tags)) {
		return []
	}

	const normalized = tags
		.filter((tag): tag is string => typeof tag === 'string')
		.map((tag) =>
			tag
				.trim()
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9:_-]/g, '-')
				.replace(/-+/g, '-')
				.replace(/^[-:_]+|[-:_]+$/g, '')
		)
		.filter((tag) => tag.length > 0 && tag.length <= 256)

	return [...new Set(normalized)]
}

export const POST = async (request: Request) => {
	if (!secret) {
		return Response.json(
			{ revalidated: false, message: 'Revalidation secret is not configured.' },
			{ status: 500 }
		)
	}

	let payload: RevalidatePayload

	try {
		payload = (await request.json()) as RevalidatePayload
	} catch {
		return Response.json(
			{ revalidated: false, message: 'Invalid JSON payload.' },
			{ status: 400 }
		)
	}

	if (payload.secret !== secret) {
		return Response.json(
			{ revalidated: false, message: 'Invalid revalidation secret.' },
			{ status: 401 }
		)
	}

	const tags = normalizeTags(payload.tags)

	if (tags.length === 0) {
		return Response.json(
			{ revalidated: false, message: 'No valid cache tags provided.' },
			{ status: 400 }
		)
	}

	if (tags.length > 128) {
		return Response.json(
			{ revalidated: false, message: 'Too many cache tags provided.' },
			{ status: 400 }
		)
	}

	for (const tag of tags) {
		revalidateTag(tag, { expire: 0 })
	}

	if (process.env.NODE_ENV === 'development') {
		console.info('[revalidate]', tags)
	}

	return Response.json({
		revalidated: true,
		tags,
		now: new Date().toISOString()
	})
}
