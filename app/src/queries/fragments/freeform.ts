import { graphql } from '@/lib/craft/graphql'

export const FreeformFormFragment = graphql(`
	fragment FreeformFormFragment on FreeformFormInterface {
		id
		uid
		name
		handle
		submissionMutationName
		successBehavior
		returnUrl
		hash
		ajax
		showProcessingText
		processingText
		successMessage
		errorMessage
		disableSubmit
		disableReset
		enctype
		csrfToken {
			name
			value
		}
		honeypot {
			name
			value
			errorMessage
		}
		captchas {
			name
			handle
			enabled
		}
		pages {
			index
			label
			buttons {
				submitLabel
				back
				backLabel
				save
				saveLabel
			}
			rows {
				id
				fields {
					__typename
					id
					type
					label
					handle
					instructions
					required
					requiredMessage
					pageIndex
					... on FreeformField_Text {
						value
						placeholder
						maxLength
					}
					... on FreeformField_Email {
						value
						placeholder
						maxLength
					}
					... on FreeformField_Textarea {
						value
						placeholder
						maxLength
						rows
					}
					... on FreeformField_Hidden {
						value
						maxLength
					}
					... on FreeformField_Dropdown {
						value
						options {
							value
							label
						}
					}
					... on FreeformField_MultipleSelect {
						values
						options {
							value
							label
						}
					}
					... on FreeformField_Checkbox {
						value
						checked
						checkedByDefault
					}
					... on FreeformField_Checkboxes {
						values
						oneLine
						options {
							value
							label
						}
					}
					... on FreeformField_Radios {
						value
						oneLine
						options {
							value
							label
						}
					}
					... on FreeformField_Number {
						value
						placeholder
						minValue
						maxValue
						minLength
						maxLength
						step
					}
					... on FreeformField_File {
						values
						fileKinds
						maxFileSizeKB
						fileCount
					}
					... on FreeformField_Html {
						content
					}
					... on FreeformField_RichText {
						content
					}
					... on FreeformField_Confirm {
						value
						targetFieldHash
						maxLength
					}
					... on FreeformField_Password {
						value
						placeholder
						minLength
						maxLength
					}
				}
			}
		}
	}
`)
