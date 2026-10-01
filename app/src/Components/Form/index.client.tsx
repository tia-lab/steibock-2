'use client'

import { Button } from '@/Components/Button'
import { useId, useState, type FormEvent } from 'react'
import $ from './style.module.scss'
import type { FormData, FormField, FormSubmitResponse } from './types'

type FormClientProps = {
	data: FormData
}

const isRedirectSuccess = (behavior?: string | null) =>
	Boolean(behavior?.toLowerCase().includes('redirect'))

const getInputType = (field: FormField) => {
	switch (field.typeName) {
		case 'FreeformField_Email':
			return 'email'
		case 'FreeformField_Number':
			return 'number'
		case 'FreeformField_Password':
			return 'password'
		default:
			return 'text'
	}
}

const FieldError = ({
	errors,
	id
}: {
	errors?: string[]
	id: string
}) =>
	errors?.length ? (
		<ul className={$.errors} id={id}>
			{errors.map((error) => (
				<li key={error}>{error}</li>
			))}
		</ul>
	) : null

const FieldInstructions = ({
	children,
	id
}: {
	children?: string | null
	id: string
}) => (children ? <p className={$.instructions} id={id}>{children}</p> : null)

const FieldLabel = ({
	field,
	htmlFor
}: {
	field: FormField
	htmlFor?: string
}) =>
	field.label ? (
		<label className={$.label} htmlFor={htmlFor}>
			{field.label}
			{field.required ? <span aria-hidden='true'>*</span> : null}
		</label>
	) : null

const FieldWrapper = ({
	children,
	field,
	fieldId,
	errors
}: {
	children: React.ReactNode
	errors?: string[]
	field: FormField
	fieldId: string
}) => {
	const instructionsId = `${fieldId}-instructions`
	const errorsId = `${fieldId}-errors`

	return (
		<div className={$.field} data-field-type={field.type ?? undefined}>
			<FieldLabel field={field} htmlFor={fieldId} />
			{children}
			<FieldInstructions id={instructionsId}>{field.instructions}</FieldInstructions>
			<FieldError errors={errors} id={errorsId} />
		</div>
	)
}

const renderField = (
	field: FormField,
	formId: number,
	errors: Record<string, string[]>
) => {
	if (!field.handle) {
		return null
	}

	const handle = field.handle
	const fieldId = `form-${formId}-${handle}`
	const instructionsId = `${fieldId}-instructions`
	const errorsId = `${fieldId}-errors`
	const fieldErrors = errors[handle]
	const describedBy = [
		field.instructions ? instructionsId : null,
		fieldErrors?.length ? errorsId : null
	]
		.filter(Boolean)
		.join(' ')
	const commonProps = {
		'aria-describedby': describedBy || undefined,
		'aria-invalid': fieldErrors?.length ? true : undefined,
		className: $.input,
		id: fieldId,
		name: handle,
		required: field.required ?? undefined
	}

	switch (field.typeName) {
		case 'FreeformField_Hidden':
			return (
				<input
					key={handle}
					type='hidden'
					name={handle}
					defaultValue={field.value ?? ''}
				/>
			)

		case 'FreeformField_Textarea':
			return (
				<FieldWrapper
					key={handle}
					field={field}
					fieldId={fieldId}
					errors={fieldErrors}>
					<textarea
						{...commonProps}
						defaultValue={field.value ?? ''}
						maxLength={field.maxLength ?? undefined}
						placeholder={field.placeholder ?? undefined}
						rows={field.rows ?? undefined}
					/>
				</FieldWrapper>
			)

		case 'FreeformField_Dropdown':
			return (
				<FieldWrapper
					key={handle}
					field={field}
					fieldId={fieldId}
					errors={fieldErrors}>
					<select {...commonProps} defaultValue={field.value ?? ''}>
						{field.options?.map((option) => (
							<option key={option.value ?? option.label} value={option.value ?? ''}>
								{option.label ?? option.value}
							</option>
						))}
					</select>
				</FieldWrapper>
			)

		case 'FreeformField_MultipleSelect':
			return (
				<FieldWrapper
					key={handle}
					field={field}
					fieldId={fieldId}
					errors={fieldErrors}>
					<select
						{...commonProps}
						defaultValue={field.values ?? []}
						multiple
						name={`${handle}[]`}>
						{field.options?.map((option) => (
							<option key={option.value ?? option.label} value={option.value ?? ''}>
								{option.label ?? option.value}
							</option>
						))}
					</select>
				</FieldWrapper>
			)

		case 'FreeformField_Checkbox':
			return (
				<div className={$.field} key={handle}>
					<label className={$.option}>
						<input
							aria-describedby={describedBy || undefined}
							aria-invalid={fieldErrors?.length ? true : undefined}
							defaultChecked={field.checkedByDefault ?? field.checked ?? false}
							name={handle}
							required={field.required ?? undefined}
							type='checkbox'
							value={field.value ?? '1'}
						/>
						<span>{field.label}</span>
					</label>
					<FieldInstructions id={instructionsId}>{field.instructions}</FieldInstructions>
					<FieldError errors={fieldErrors} id={errorsId} />
				</div>
			)

		case 'FreeformField_Checkboxes':
		case 'FreeformField_Radios': {
			const isCheckbox = field.typeName === 'FreeformField_Checkboxes'
			const selectedValues = new Set(field.values ?? [])

			return (
				<fieldset className={$.field} key={handle}>
					{field.label ? (
						<legend className={$.label}>
							{field.label}
							{field.required ? <span aria-hidden='true'>*</span> : null}
						</legend>
					) : null}
					<div className={$.options} data-one-line={field.oneLine ?? undefined}>
						{field.options?.map((option) => {
							const value = option.value ?? ''

							return (
								<label className={$.option} key={value || option.label}>
									<input
										defaultChecked={
											isCheckbox
												? selectedValues.has(value)
												: field.value === value
										}
										name={isCheckbox ? `${handle}[]` : handle}
										required={field.required ?? undefined}
										type={isCheckbox ? 'checkbox' : 'radio'}
										value={value}
									/>
									<span>{option.label ?? value}</span>
								</label>
							)
						})}
					</div>
					<FieldInstructions id={instructionsId}>{field.instructions}</FieldInstructions>
					<FieldError errors={fieldErrors} id={errorsId} />
				</fieldset>
			)
		}

		case 'FreeformField_File':
			return (
				<FieldWrapper
					key={handle}
					field={field}
					fieldId={fieldId}
					errors={fieldErrors}>
					<input
						{...commonProps}
						accept={field.fileKinds?.join(',') || undefined}
						multiple={(field.fileCount ?? 1) > 1}
						type='file'
					/>
				</FieldWrapper>
			)

		case 'FreeformField_Html':
		case 'FreeformField_RichText':
			return field.content ? (
				<div
					className={$.html}
					dangerouslySetInnerHTML={{ __html: field.content }}
					key={handle}
				/>
			) : null

		default:
			return (
				<FieldWrapper
					key={handle}
					field={field}
					fieldId={fieldId}
					errors={fieldErrors}>
					<input
						{...commonProps}
						defaultValue={field.value ?? ''}
						max={field.maxValue ?? undefined}
						maxLength={field.maxLength ?? undefined}
						min={field.minValue ?? undefined}
						minLength={field.minLength ?? undefined}
						placeholder={field.placeholder ?? undefined}
						step={field.step ?? undefined}
						type={getInputType(field)}
					/>
				</FieldWrapper>
			)
	}
}

export const FormClient = ({ data }: FormClientProps) => {
	const fallbackId = useId()
	const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>(
		'idle'
	)
	const [hash, setHash] = useState(data.hash ?? '')
	const [errors, setErrors] = useState<Record<string, string[]>>({})
	const [formErrors, setFormErrors] = useState<string[]>([])
	const isSubmitting = status === 'submitting'
	const shouldDisableSubmit = isSubmitting && data.disableSubmit !== false
	const activePage = data.pages[0]
	const fieldHandles =
		activePage?.rows
			.flatMap((row) => row.fields)
			.map((field) => field.handle)
			.filter((handle): handle is string => Boolean(handle)) ?? []
	const submitLabel = activePage?.buttons?.submitLabel ?? 'Submit'
	const submittingLabel =
		data.showProcessingText && data.processingText ? data.processingText : submitLabel

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setStatus('submitting')
		setErrors({})
		setFormErrors([])

		const formData = new FormData(event.currentTarget)
		formData.set('formSourceUrl', window.location.href)

		try {
			const response = await fetch('/api/forms/freeform', {
				body: formData,
				method: 'POST'
			})
			const payload = (await response.json()) as FormSubmitResponse

			if (payload.hash) {
				setHash(payload.hash)
			}

			if (!response.ok || !payload.success) {
				setErrors(payload.errors ?? {})
				setFormErrors(
					payload.formErrors?.length
						? payload.formErrors
						: [payload.message ?? data.errorMessage ?? 'The form could not be submitted.']
				)
				setStatus('error')
				return
			}

			setStatus('success')

			if (payload.returnUrl && isRedirectSuccess(payload.onSuccess)) {
				window.location.href = payload.returnUrl
			}
		} catch {
			setFormErrors([data.errorMessage ?? 'The form could not be submitted.'])
			setStatus('error')
		}
	}

	if (!data.id || !activePage) {
		return null
	}

	const formId = data.id

	return (
		<form
			className={$.form}
			data-form-handle={data.handle ?? undefined}
			encType={data.enctype ?? undefined}
			id={`freeform-${data.handle ?? fallbackId}`}
			method='post'
			onSubmit={handleSubmit}>
			<input type='hidden' name='action' value='freeform/submit' />
			<input type='hidden' name='freeform-action' value='submit' />
			<input type='hidden' name='formHash' value={hash} />
			{data.submissionMutationName ? (
				<input
					type='hidden'
					name='submissionMutationName'
					value={data.submissionMutationName}
				/>
			) : null}
			<input
				type='hidden'
				name='freeformFieldHandles'
				value={JSON.stringify(fieldHandles)}
			/>
			{data.csrfToken?.name && data.csrfToken.value ? (
				<>
					<input
						type='hidden'
						name={data.csrfToken.name}
						value={data.csrfToken.value}
					/>
					<input type='hidden' name='csrfTokenName' value={data.csrfToken.name} />
				</>
			) : null}
			{data.honeypot?.name ? (
				<input
					autoComplete='off'
					tabIndex={-1}
					type='text'
					name={data.honeypot.name}
					defaultValue={data.honeypot.value ?? ''}
					className={$.honeypot}
					aria-hidden='true'
				/>
			) : null}
			{formErrors.length ? (
				<div className={$.form_errors} role='alert'>
					{formErrors.map((error) => (
						<p key={error}>{error}</p>
					))}
				</div>
			) : null}
			{status === 'success' ? (
				<div className={$.success} role='status'>
					{data.successMessage ?? 'Thank you.'}
				</div>
			) : null}
			<div className={$.page}>
				{activePage.rows.map((row, rowIndex) => (
					<div className={$.row} key={row.id ?? rowIndex}>
						{row.fields.map((field) => renderField(field, formId, errors))}
					</div>
				))}
			</div>
			<Button disabled={shouldDisableSubmit} type='submit'>
				{isSubmitting ? submittingLabel : submitLabel}
			</Button>
		</form>
	)
}
