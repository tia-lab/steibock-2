const absoluteOrigin = (value: string) => {
	const url = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
		? value
		: `https://${value}`

	return new URL(url).origin
}

export const getSiteUrl = (requestOrigin?: string) => {
	const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL

	if (configuredUrl) {
		return absoluteOrigin(configuredUrl)
	}

	if (requestOrigin) {
		return absoluteOrigin(requestOrigin)
	}

	return 'http://localhost:3000'
}
