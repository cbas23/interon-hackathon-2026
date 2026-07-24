import {
  apiErrorSchema,
  patientContextResponseSchema,
  patientSearchResponseSchema,
  reconciliationResponseSchema,
  z,
  type PatientContextResponse,
  type PatientSearchParams,
  type PatientSearchResponse,
  type ReconciliationRequest,
  type ReconciliationResponse,
} from '@app/schemas'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(
  /\/$/,
  '',
)

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId?: string

  constructor(
    message: string,
    options: { code: string; status: number; requestId?: string },
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = options.code
    this.status = options.status
    this.requestId = options.requestId
  }
}

async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init.headers,
    },
  })
  const body: unknown = await response.json().catch(() => undefined)

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(body)
    if (parsedError.success) {
      throw new ApiError(parsedError.data.error.message, {
        code: parsedError.data.error.code,
        status: response.status,
        requestId: parsedError.data.error.requestId,
      })
    }

    throw new ApiError(
      response.status === 502 && body === undefined
        ? 'The API server is unavailable. Check the backend connection.'
        : 'The server returned an unexpected error.',
      {
        code: 'INVALID_ERROR_RESPONSE',
        status: response.status,
      },
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError('The server returned an invalid response.', {
      code: 'INVALID_API_RESPONSE',
      status: response.status,
    })
  }

  return parsed.data
}

export function searchPatients(
  criteria: PatientSearchParams,
  options: { signal?: AbortSignal } = {},
): Promise<PatientSearchResponse> {
  const search = new URLSearchParams()
  if (criteria.name) search.set('name', criteria.name)
  if (criteria.dateOfBirth) search.set('dateOfBirth', criteria.dateOfBirth)
  if (criteria.mrn) search.set('mrn', criteria.mrn)

  return requestJson(
    `/patients?${search.toString()}`,
    patientSearchResponseSchema,
    { signal: options.signal },
  )
}

export function getPatientContext(
  patientId: string,
  options: { signal?: AbortSignal } = {},
): Promise<PatientContextResponse> {
  return requestJson(
    `/patients/${encodeURIComponent(patientId)}/context`,
    patientContextResponseSchema,
    { signal: options.signal },
  )
}

export function runReconciliation(
  patientId: string,
  request: ReconciliationRequest,
  options: { signal?: AbortSignal } = {},
): Promise<ReconciliationResponse> {
  return requestJson(
    `/patients/${encodeURIComponent(patientId)}/reconciliations`,
    reconciliationResponseSchema,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: options.signal,
    },
  )
}
