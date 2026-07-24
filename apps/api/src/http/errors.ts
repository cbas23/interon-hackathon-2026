import type { ApiErrorResponse } from '@app/schemas'

export type ApiErrorCode =
  | 'AI_INVALID_OUTPUT'
  | 'AI_NOT_CONFIGURED'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'DATASET_TOO_LARGE'
  | 'FHIR_ERROR'
  | 'FHIR_TIMEOUT'
  | 'INTERNAL_ERROR'
  | 'INVALID_JSON'
  | 'NO_RECONCILIATION_RECORDS'
  | 'PATIENT_NOT_FOUND'
  | 'VALIDATION_ERROR'

export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly issues?: ApiErrorResponse['error']['issues']

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    options: {
      cause?: unknown
      issues?: ApiErrorResponse['error']['issues']
    } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.issues = options.issues
  }
}

export function apiErrorResponse(error: AppError, requestId: string) {
  return {
    error: {
      code: error.code,
      message: error.message,
      requestId,
      ...(error.issues ? { issues: error.issues } : {}),
    },
  } satisfies ApiErrorResponse
}
