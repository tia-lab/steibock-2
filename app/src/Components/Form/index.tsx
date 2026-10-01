import { FreeformFormFragment } from '@/queries'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import { FormClient } from './index.client'
import type { FormData, FormField, FormOption, FormPage, FormRow } from './types'

type FormProps = {
	data?: FragmentOf<typeof FreeformFormFragment> | null
}

type RawOption = FormOption | null
type RawField = FormField & {
	__typename?: string
	options?: RawOption[] | null
}
type RawRow = {
	fields?: Array<RawField | null> | null
	id?: string | null
}
type RawPage = {
	buttons?: FormPage['buttons']
	index?: number | null
	label?: string | null
	rows?: Array<RawRow | null> | null
}

const normalizeOptions = (options?: RawOption[] | null): FormOption[] =>
	options?.filter((option): option is FormOption => Boolean(option)) ?? []

const normalizeField = (field: RawField): FormField => ({
	checked: field.checked,
	checkedByDefault: field.checkedByDefault,
	content: field.content,
	fileCount: field.fileCount,
	fileKinds: field.fileKinds,
	handle: field.handle,
	id: field.id,
	instructions: field.instructions,
	label: field.label,
	maxFileSizeKB: field.maxFileSizeKB,
	maxLength: field.maxLength,
	maxValue: field.maxValue,
	minLength: field.minLength,
	minValue: field.minValue,
	oneLine: field.oneLine,
	options: normalizeOptions(field.options),
	pageIndex: field.pageIndex,
	placeholder: field.placeholder,
	required: field.required,
	requiredMessage: field.requiredMessage,
	rows: field.rows,
	step: field.step,
	targetFieldHash: field.targetFieldHash,
	type: field.type,
	typeName: field.__typename,
	value: field.value,
	values: field.values
})

const normalizeRow = (row: RawRow): FormRow => ({
	id: row.id,
	fields:
		row.fields
			?.filter(Boolean)
			.map((field) => normalizeField(field as RawField)) ?? []
})

const normalizePage = (page: RawPage): FormPage => ({
	buttons: page.buttons,
	index: page.index,
	label: page.label,
	rows:
		page.rows?.filter(Boolean).map((row) => normalizeRow(row as RawRow)) ??
		[]
})

export const Form = ({ data }: FormProps) => {
	const form = data ? readFragment(FreeformFormFragment, data) : null

	if (!form?.id || !form.handle) {
		return null
	}

	const normalized: FormData = {
		ajax: form.ajax,
		captchas:
			form.captchas?.filter(
				(captcha): captcha is NonNullable<typeof captcha> => Boolean(captcha)
			) ?? [],
		csrfToken: form.csrfToken,
		disableReset: form.disableReset,
		disableSubmit: form.disableSubmit,
		enctype: form.enctype,
		errorMessage: form.errorMessage,
		handle: form.handle,
		hash: form.hash,
		honeypot: form.honeypot,
		id: form.id,
		name: form.name,
		pages:
			form.pages?.filter(Boolean).map((page) => normalizePage(page as RawPage)) ??
			[],
		processingText: form.processingText,
		returnUrl: form.returnUrl,
		showProcessingText: form.showProcessingText,
		submissionMutationName: form.submissionMutationName,
		successBehavior: form.successBehavior,
		successMessage: form.successMessage,
		uid: form.uid
	}

	return <FormClient data={normalized} />
}
