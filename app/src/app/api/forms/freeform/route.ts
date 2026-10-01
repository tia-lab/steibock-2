const endpoint = process.env.CRAFT_GRAPHQL_ENDPOINT
const token = process.env.CRAFT_GRAPHQL_TOKEN

const GRAPHQL_NAME_PATTERN = /^[_A-Za-z][_0-9A-Za-z]*$/
const INTERNAL_FIELDS = new Set([
	'action',
	'csrfTokenName',
	'formHash',
	'formSourceUrl',
	'freeform-action',
	'freeformFieldHandles',
	'submissionMutationName'
])

type GraphQLErrorPayload = {
	message: string
}

type FreeformSubmissionPayload = {
	duplicate?: boolean
	finished?: boolean
	freeformPayload?: string | null
	hash?: string | null
	html?: string | null
	multiPage?: boolean
	onSuccess?: string | null
	returnUrl?: string | null
	submissionId?: number | null
	submissionToken?: string | null
	success?: boolean | null
}

type CraftGraphQLResponse = {
	data?: Record<string, FreeformSubmissionPayload | null>
	errors?: GraphQLErrorPayload[]
}

const assertCraftConfig = () => {
	if (!endpoint) {
		throw new Error('Missing CRAFT_GRAPHQL_ENDPOINT.')
	}

	if (!token) {
		throw new Error('Missing CRAFT_GRAPHQL_TOKEN.')
	}

	return { endpoint, token }
}

const parseFieldHandles = (body: FormData) => {
	const raw = body.get('freeformFieldHandles')

	if (typeof raw !== 'string') {
		return []
	}

	try {
		const parsed = JSON.parse(raw) as unknown

		if (!Array.isArray(parsed)) {
			return []
		}

		return parsed.filter(
			(handle): handle is string =>
				typeof handle === 'string' && GRAPHQL_NAME_PATTERN.test(handle)
		)
	} catch {
		return []
	}
}

const serializeGraphQLValue = (
	value: FormDataEntryValue | FormDataEntryValue[]
): string => {
	if (Array.isArray(value)) {
		return `[${value.map(serializeGraphQLValue).join(', ')}]`
	}

	if (value instanceof File) {
		if (value.size > 0) {
			throw new Error('File fields are not supported by the GraphQL form route.')
		}

		return 'null'
	}

	return JSON.stringify(value)
}

const getFieldValues = (body: FormData, handle: string) => {
	const values = [...body.getAll(handle), ...body.getAll(`${handle}[]`)].filter(
		(value) => !(value instanceof File && value.size === 0)
	)

	if (!values.length) {
		return null
	}

	return values.length === 1 ? values[0] : values
}

const getCsrfArgument = (body: FormData) => {
	const csrfTokenName = body.get('csrfTokenName')

	if (typeof csrfTokenName !== 'string') {
		return null
	}

	const csrfTokenValue = body.get(csrfTokenName)

	if (typeof csrfTokenValue !== 'string') {
		return null
	}

	return `csrfToken: { name: ${JSON.stringify(csrfTokenName)}, value: ${JSON.stringify(csrfTokenValue)} }`
}

const getMutationArguments = (body: FormData) => {
	const fieldHandles = parseFieldHandles(body)
	const args: string[] = []
	const csrfArgument = getCsrfArgument(body)

	if (csrfArgument) {
		args.push(csrfArgument)
	}

	for (const handle of fieldHandles) {
		if (INTERNAL_FIELDS.has(handle)) {
			continue
		}

		const value = getFieldValues(body, handle)

		if (value === null) {
			continue
		}

		args.push(`${handle}: ${serializeGraphQLValue(value)}`)
	}

	return args.join('\n')
}

const parseGraphQLErrorMessage = (message: string) => {
	try {
		const parsed = JSON.parse(message) as unknown

		if (!Array.isArray(parsed)) {
			return { errors: {}, formErrors: [message] }
		}

		const errors: Record<string, string[]> = {}
		const formErrors: string[] = []

		for (const item of parsed) {
			if (!item || typeof item !== 'object' || Array.isArray(item)) {
				continue
			}

			for (const [key, value] of Object.entries(item)) {
				const messages = Array.isArray(value)
					? value.filter((entry): entry is string => typeof entry === 'string')
					: typeof value === 'string'
						? [value]
						: []

				if (!messages.length) {
					continue
				}

				if (GRAPHQL_NAME_PATTERN.test(key)) {
					errors[key] = messages
				} else {
					formErrors.push(...messages)
				}
			}
		}

		return { errors, formErrors }
	} catch {
		return { errors: {}, formErrors: [message] }
	}
}

const normalizeGraphQLErrors = (errors: GraphQLErrorPayload[] = []) => {
	const fieldErrors: Record<string, string[]> = {}
	const formErrors: string[] = []

	for (const error of errors) {
		const normalized = parseGraphQLErrorMessage(error.message)

		for (const [key, messages] of Object.entries(normalized.errors)) {
			fieldErrors[key] = [...(fieldErrors[key] ?? []), ...messages]
		}

		formErrors.push(...normalized.formErrors)
	}

	return {
		errors: fieldErrors,
		formErrors: formErrors.length ? formErrors : ['The form could not be submitted.']
	}
}

export const POST = async (request: Request) => {
	let body: FormData

	try {
		body = await request.formData()
	} catch {
		return Response.json(
			{ success: false, message: 'Invalid form payload.' },
			{ status: 400 }
		)
	}

	const mutationName = body.get('submissionMutationName')

	if (
		typeof mutationName !== 'string' ||
		!GRAPHQL_NAME_PATTERN.test(mutationName)
	) {
		return Response.json(
			{ success: false, message: 'Missing Freeform submission mutation.' },
			{ status: 400 }
		)
	}

	let args: string

	try {
		args = getMutationArguments(body)
	} catch (error) {
		return Response.json(
			{
				success: false,
				message:
					error instanceof Error ? error.message : 'Invalid Freeform form payload.'
			},
			{ status: 400 }
		)
	}

	const config = assertCraftConfig()
	const response = await fetch(config.endpoint, {
		body: JSON.stringify({
			query: `
				mutation SubmitFreeformForm {
					${mutationName}(${args}) {
						success
						hash
						multiPage
						finished
						submissionId
						submissionToken
						duplicate
						onSuccess
						returnUrl
						html
						freeformPayload
					}
				}
			`
		}),
		headers: {
			Authorization: `Bearer ${config.token}`,
			'Content-Type': 'application/json'
		},
		method: 'POST'
	})

	if (!response.ok) {
		return Response.json(
			{ success: false, message: `Craft GraphQL returned ${response.status}.` },
			{ status: response.status }
		)
	}

	const payload = (await response.json()) as CraftGraphQLResponse

	if (payload.errors?.length) {
		return Response.json(
			{
				success: false,
				message: payload.errors[0]?.message,
				...normalizeGraphQLErrors(payload.errors)
			},
			{ status: 200 }
		)
	}

	const submission = payload.data?.[mutationName]

	if (!submission) {
		return Response.json(
			{ success: false, message: 'Craft GraphQL response did not include data.' },
			{ status: 502 }
		)
	}

	return Response.json({
		...submission,
		success: Boolean(submission.success)
	})
}
