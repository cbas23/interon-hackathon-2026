import {
  patientSearchParamsSchema,
  type PatientSearchParams,
} from '@app/schemas'

import { FhirClient, type FhirRequestOptions } from './client'
import { fhirConfig } from './config'
import type {
  FhirAllergyIntolerance,
  FhirDocumentReference,
  FhirEncounter,
  FhirMedication,
  FhirMedicationDispense,
  FhirMedicationRequest,
  FhirMedicationStatement,
  FhirPatient,
  FhirResource,
  FhirSearchParameters,
  FhirSearchResult,
} from './types'

export const fhirClient = new FhirClient({
  baseUrl: fhirConfig.baseUrl,
  requestTimeoutMs: fhirConfig.requestTimeoutMs,
  maxPages: fhirConfig.maxPages,
  maxResources: fhirConfig.maxResources,
})

export interface FhirReconciliationData {
  patient: FhirPatient
  allergies: FhirAllergyIntolerance[]
  medicationRequests: FhirMedicationRequest[]
  medicationStatements: FhirMedicationStatement[]
  medicationDispenses: FhirMedicationDispense[]
  medications: FhirMedication[]
  encounters: FhirEncounter[]
  documents: FhirDocumentReference[]
}

function isMedication(resource: FhirResource): resource is FhirMedication {
  return resource.resourceType === 'Medication'
}

function uniqueMedications(resources: FhirResource[]) {
  const medications = new Map<string, FhirMedication>()

  for (const resource of resources) {
    if (!isMedication(resource)) {
      continue
    }

    const key = resource.id
      ? `Medication/${resource.id}`
      : JSON.stringify(resource)
    medications.set(key, resource)
  }

  return [...medications.values()]
}

function patientSearchParameters(criteria: PatientSearchParams) {
  const parsed = patientSearchParamsSchema.parse(criteria)

  return {
    name: parsed.name,
    birthdate: parsed.dateOfBirth,
    identifier: parsed.mrn,
    _count: 20,
  } satisfies FhirSearchParameters
}

export function searchFhirPatients(
  criteria: PatientSearchParams,
  options: FhirRequestOptions = {},
): Promise<FhirSearchResult<FhirPatient>> {
  return fhirClient.search<FhirPatient>(
    'Patient',
    patientSearchParameters(criteria),
    options,
  )
}

export function getFhirPatient(
  patientId: string,
  options: FhirRequestOptions = {},
) {
  return fhirClient.read<FhirPatient>('Patient', patientId, options)
}

export async function getFhirReconciliationData(
  patientId: string,
  options: FhirRequestOptions = {},
): Promise<FhirReconciliationData> {
  const patientReference = patientId
  const medicationIncludeOptions = {
    ...options,
    maxPages: fhirConfig.maxPages,
    maxResources: fhirConfig.maxResources,
  }

  const [
    patient,
    allergyResult,
    medicationRequestResult,
    medicationStatementResult,
    medicationDispenseResult,
    encounterResult,
    documentResult,
  ] = await Promise.all([
    getFhirPatient(patientId, options),
    fhirClient.searchAll<FhirAllergyIntolerance>(
      'AllergyIntolerance',
      { patient: patientReference, _count: 100 },
      options,
    ),
    fhirClient.searchAll<FhirMedicationRequest>(
      'MedicationRequest',
      {
        patient: patientReference,
        _count: 100,
        _include: 'MedicationRequest:medication',
      },
      medicationIncludeOptions,
    ),
    fhirClient.searchAll<FhirMedicationStatement>(
      'MedicationStatement',
      {
        patient: patientReference,
        _count: 100,
        _include: 'MedicationStatement:medication',
      },
      medicationIncludeOptions,
    ),
    fhirClient.searchAll<FhirMedicationDispense>(
      'MedicationDispense',
      {
        patient: patientReference,
        _count: 100,
        _include: 'MedicationDispense:medication',
      },
      medicationIncludeOptions,
    ),
    fhirClient.searchAll<FhirEncounter>(
      'Encounter',
      { patient: patientReference, _count: 100, _sort: '-date' },
      options,
    ),
    fhirClient.searchAll<FhirDocumentReference>(
      'DocumentReference',
      { patient: patientReference, _count: 100, _sort: '-date' },
      options,
    ),
  ])

  return {
    patient,
    allergies: allergyResult.resources,
    medicationRequests: medicationRequestResult.resources,
    medicationStatements: medicationStatementResult.resources,
    medicationDispenses: medicationDispenseResult.resources,
    medications: uniqueMedications([
      ...medicationRequestResult.included,
      ...medicationStatementResult.included,
      ...medicationDispenseResult.included,
    ]),
    encounters: encounterResult.resources,
    documents: documentResult.resources,
  }
}
