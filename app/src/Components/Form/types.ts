export type FormOption = {
	label?: string | null
	value?: string | null
}

export type FormField = {
	checked?: boolean | null
	checkedByDefault?: boolean | null
	content?: string | null
	fileCount?: number | null
	fileKinds?: string[] | null
	handle?: string | null
	id?: number | null
	instructions?: string | null
	label?: string | null
	maxFileSizeKB?: number | null
	maxLength?: number | null
	maxValue?: number | null
	minLength?: number | null
	minValue?: number | null
	oneLine?: boolean | null
	options?: FormOption[] | null
	pageIndex?: number | null
	placeholder?: string | null
	required?: boolean | null
	requiredMessage?: string | null
	rows?: number | null
	step?: number | null
	targetFieldHash?: string | null
	type?: string | null
	typeName?: string | null
	value?: string | null
	values?: string[] | null
}

export type FormRow = {
	id?: string | null
	fields: FormField[]
}

export type FormPage = {
	buttons?: {
		back?: boolean | null
		backLabel?: string | null
		save?: boolean | null
		saveLabel?: string | null
		submitLabel?: string | null
	} | null
	index?: number | null
	label?: string | null
	rows: FormRow[]
}

export type FormData = {
	ajax?: boolean | null
	captchas?: Array<{
		enabled?: boolean | null
		handle?: string | null
		name?: string | null
	}> | null
	csrfToken?: {
		name?: string | null
		value?: string | null
	} | null
	disableReset?: boolean | null
	disableSubmit?: boolean | null
	enctype?: string | null
	errorMessage?: string | null
	handle?: string | null
	hash?: string | null
	honeypot?: {
		errorMessage?: string | null
		name?: string | null
		value?: string | null
	} | null
	id?: number | null
	name?: string | null
	pages: FormPage[]
	processingText?: string | null
	returnUrl?: string | null
	showProcessingText?: boolean | null
	submissionMutationName?: string | null
	successBehavior?: string | null
	successMessage?: string | null
	uid?: string | null
}

export type FormSubmitResponse = {
	actions?: unknown
	duplicate?: boolean
	errors?: Record<string, string[]>
	finished?: boolean
	formErrors?: string[]
	hash?: string
	html?: string
	id?: number | null
	message?: string
	onSuccess?: string | null
	returnUrl?: string | null
	submissionId?: number | null
	submissionToken?: string | null
	success: boolean
	values?: Record<string, unknown>
}
