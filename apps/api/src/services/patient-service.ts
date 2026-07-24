import {
  patientContextResponseSchema,
  patientSearchResponseSchema,
  type PatientContextResponse,
  type PatientSearchParams,
  type PatientSearchResponse,
} from '@app/schemas'

import { FhirClientError } from '../fhir/client'
import {
  getFhirReconciliationData,
  searchFhirPatients,
} from '../fhir/reconciliation-data'
import { mapFhirPatient, mapFhirReconciliationData } from '../fhir/mappers'
import { AppError } from '../http/errors'

function serviceSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  return signal
    ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs)
}

function mapFhirFailure(error: unknown): never {
  if (error instanceof FhirClientError) {
    if (error.status === 404) {
      throw new AppError(
        'PATIENT_NOT_FOUND',
        404,
        'Patient record could not be found.',
        { cause: error },
      )
    }

    const timeout = error.message.toLowerCase().includes('timed out')
    throw new AppError(
      timeout ? 'FHIR_TIMEOUT' : 'FHIR_ERROR',
      timeout ? 504 : 502,
      timeout
        ? 'The clinical record source timed out.'
        : 'The clinical record source is unavailable.',
      { cause: error },
    )
  }

  throw error
}

export async function searchPatients(
  criteria: PatientSearchParams,
  options: { signal?: AbortSignal } = {},
): Promise<PatientSearchResponse> {
  try {
    const result = await searchFhirPatients(criteria, {
      signal: serviceSignal(options.signal, 20_000),
    })
    const patients = result.resources
      .filter((patient) => Boolean(patient.id))
      .map((patient) => mapFhirPatient(patient))

    return patientSearchResponseSchema.parse({
      patients,
      total: result.total ?? null,
      hasMore: result.hasMore,
    })
  } catch (error) {
    mapFhirFailure(error)
  }
}

export async function getPatientContext(
  patientId: string,
  options: { signal?: AbortSignal } = {},
): Promise<PatientContextResponse> {
  try {
    const data = await getFhirReconciliationData(patientId, {
      signal: serviceSignal(options.signal, 30_000),
    })
    return patientContextResponseSchema.parse(mapFhirReconciliationData(data))
  } catch (error) {
    mapFhirFailure(error)
  }
}
