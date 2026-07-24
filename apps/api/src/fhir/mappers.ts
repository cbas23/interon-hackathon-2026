import { createHash } from 'node:crypto'
import type {
  ClinicalRecord,
  Medication,
  Patient,
  PatientContextResponse,
} from '@app/schemas'

import { fhirConfig } from './config'
import type { FhirReconciliationData } from './reconciliation-data'
import type {
  FhirAllergyIntolerance,
  FhirCodeableConcept,
  FhirDocumentReference,
  FhirDosage,
  FhirEncounter,
  FhirIdentifier,
  FhirMedication,
  FhirMedicationDispense,
  FhirMedicationRequest,
  FhirMedicationStatement,
  FhirPatient,
  FhirQuantity,
  FhirReference,
  FhirResource,
} from './types'

function conceptText(concept: FhirCodeableConcept | undefined) {
  return (
    concept?.text?.trim() ||
    concept?.coding
      ?.find((coding) => coding.display?.trim())
      ?.display?.trim() ||
    concept?.coding?.find((coding) => coding.code?.trim())?.code?.trim() ||
    null
  )
}

function referenceDisplay(reference: FhirReference | undefined) {
  return reference?.display?.trim() || null
}

function quantityText(quantity: FhirQuantity | undefined) {
  if (quantity?.value === undefined) {
    return null
  }

  return `${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ''}`
}

function normalizeTimestamp(value: string | undefined) {
  if (!value) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}

function nameText(patient: FhirPatient) {
  const names = patient.name ?? []
  const name =
    names.find((candidate) => candidate.use === 'official') ??
    names.find((candidate) => candidate.use === 'usual') ??
    names.find((candidate) => candidate.use !== 'old') ??
    names[0]

  if (!name) {
    return 'Name not recorded'
  }

  return (
    name.text?.trim() ||
    [...(name.given ?? []), name.family]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ') ||
    'Name not recorded'
  )
}

function isMrn(identifier: FhirIdentifier) {
  return identifier.type?.coding?.some((coding) => coding.code === 'MR')
}

function patientMrn(patient: FhirPatient) {
  const identifiers =
    patient.identifier?.filter((identifier) => identifier.value) ?? []
  const identifier =
    identifiers.find(isMrn) ??
    (fhirConfig.mrnSystem
      ? identifiers.find(
          (candidate) => candidate.system === fhirConfig.mrnSystem,
        )
      : undefined) ??
    identifiers[0]

  return identifier?.value?.trim() || null
}

function verificationCode(allergy: FhirAllergyIntolerance) {
  return allergy.verificationStatus?.coding?.find((coding) => coding.code)?.code
}

function allergyNames(allergies: FhirAllergyIntolerance[]) {
  return [
    ...new Set(
      allergies
        .filter((allergy) => {
          const status = verificationCode(allergy)
          return status !== 'refuted' && status !== 'entered-in-error'
        })
        .map((allergy) => conceptText(allergy.code))
        .filter((allergy): allergy is string => Boolean(allergy)),
    ),
  ]
}

export function mapFhirPatient(
  patient: FhirPatient,
  options: {
    allergies?: FhirAllergyIntolerance[]
    allergiesAvailable?: boolean
  } = {},
): Patient {
  if (!patient.id) {
    throw new Error('FHIR Patient is missing its logical ID.')
  }

  return {
    id: patient.id,
    displayName: nameText(patient),
    mrn: patientMrn(patient),
    dateOfBirth:
      patient.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(patient.birthDate)
        ? patient.birthDate
        : null,
    sex: patient.gender ?? 'unknown',
    pronouns: null,
    allergies: allergyNames(options.allergies ?? []),
    allergiesAvailable: options.allergiesAvailable ?? false,
    primaryCareProvider:
      patient.generalPractitioner
        ?.map(referenceDisplay)
        .find((display): display is string => Boolean(display)) ??
      referenceDisplay(patient.managingOrganization),
  }
}

function normalizeMedicationReference(reference: string | undefined) {
  if (!reference) {
    return null
  }

  const match = reference.match(
    /(?:^|\/)Medication\/([^/]+)(?:\/_history\/[^/]+)?$/,
  )
  return match?.[1] ? `Medication/${match[1]}` : null
}

function medicationIndex(medications: FhirMedication[]) {
  return new Map(
    medications
      .filter((medication) => medication.id)
      .map((medication) => [`Medication/${medication.id}`, medication]),
  )
}

function medicationConcept(
  code: FhirCodeableConcept | undefined,
  reference: FhirReference<'Medication'> | undefined,
  medications: ReadonlyMap<string, FhirMedication>,
) {
  const direct = conceptText(code)
  if (direct) {
    return { name: direct, medication: undefined }
  }

  const key = normalizeMedicationReference(reference?.reference)
  const medication = key ? medications.get(key) : undefined

  return {
    name:
      conceptText(medication?.code) ??
      referenceDisplay(reference) ??
      'Medication name not recorded',
    medication,
  }
}

function medicationStrength(medication: FhirMedication | undefined) {
  const ingredient = medication?.ingredient?.find(
    (candidate) => candidate.strength,
  )
  const numerator = quantityText(ingredient?.strength?.numerator)
  const denominator = quantityText(ingredient?.strength?.denominator)

  if (!numerator) {
    return null
  }

  return denominator ? `${numerator} per ${denominator}` : numerator
}

function dosageDetails(dosage: FhirDosage | undefined) {
  const dose =
    quantityText(dosage?.doseAndRate?.[0]?.doseQuantity) ??
    dosage?.doseAndRate?.[0]?.doseRange?.low?.value?.toString() ??
    null
  const route = conceptText(dosage?.route)
  const frequency =
    dosage?.text?.trim() ||
    conceptText(dosage?.timing?.code) ||
    timingText(dosage)

  return { dose, route, frequency }
}

function timingText(dosage: FhirDosage | undefined) {
  const repeat = dosage?.timing?.repeat
  if (!repeat?.frequency) {
    return null
  }

  if (!repeat.period || !repeat.periodUnit) {
    return `${repeat.frequency} time${repeat.frequency === 1 ? '' : 's'}`
  }

  return `${repeat.frequency} time${repeat.frequency === 1 ? '' : 's'} every ${repeat.period} ${repeat.periodUnit}`
}

function stableRecordId(resource: FhirResource) {
  if (resource.id) {
    return `${resource.resourceType}-${resource.id}`
  }

  const digest = createHash('sha256')
    .update(JSON.stringify(resource))
    .digest('hex')
    .slice(0, 16)
  return `${resource.resourceType}-${digest}`
}

function mapMedication(
  name: string,
  medication: FhirMedication | undefined,
  dosage: FhirDosage | undefined,
  status: Medication['status'],
): Medication {
  const details = dosageDetails(dosage)
  return {
    name,
    strength: medicationStrength(medication),
    dose: details.dose,
    route: details.route,
    frequency: details.frequency,
    status,
  }
}

function requestStatus(
  status: FhirMedicationRequest['status'],
): Medication['status'] {
  if (status === 'stopped' || status === 'cancelled') return 'discontinued'
  if (status === 'completed') return 'historical'
  return 'active'
}

function statementStatus(
  status: FhirMedicationStatement['status'],
): Medication['status'] {
  if (status === 'stopped' || status === 'not-taken') return 'discontinued'
  if (status === 'completed') return 'historical'
  return 'active'
}

function dispenseStatus(
  status: FhirMedicationDispense['status'],
): Medication['status'] {
  if (['cancelled', 'stopped', 'declined'].includes(status))
    return 'discontinued'
  return status === 'completed' ? 'historical' : 'active'
}

function mapMedicationRequest(
  resource: FhirMedicationRequest,
  patientId: string,
  medications: ReadonlyMap<string, FhirMedication>,
): ClinicalRecord | null {
  if (resource.status === 'entered-in-error') return null
  const resolved = medicationConcept(
    resource.medicationCodeableConcept,
    resource.medicationReference,
    medications,
  )

  return {
    id: stableRecordId(resource),
    patientId,
    recordedAt: normalizeTimestamp(
      resource.authoredOn ?? resource.meta?.lastUpdated,
    ),
    source: 'unknown',
    title: 'Medication order',
    author: referenceDisplay(resource.requester),
    organization: null,
    note: resource.note?.map((note) => note.text).join('\n') || null,
    medications: [
      mapMedication(
        resolved.name,
        resolved.medication,
        resource.dosageInstruction?.[0],
        requestStatus(resource.status),
      ),
    ],
  }
}

function mapMedicationStatement(
  resource: FhirMedicationStatement,
  patientId: string,
  medications: ReadonlyMap<string, FhirMedication>,
): ClinicalRecord | null {
  if (resource.status === 'entered-in-error') return null
  const resolved = medicationConcept(
    resource.medicationCodeableConcept,
    resource.medicationReference,
    medications,
  )
  const patientReported =
    resource.informationSource?.reference?.startsWith('Patient/')

  return {
    id: stableRecordId(resource),
    patientId,
    recordedAt: normalizeTimestamp(
      resource.dateAsserted ??
        resource.effectiveDateTime ??
        resource.effectivePeriod?.start ??
        resource.meta?.lastUpdated,
    ),
    source: patientReported ? 'patient_report' : 'unknown',
    title: 'Medication statement',
    author: referenceDisplay(resource.informationSource),
    organization: null,
    note: resource.note?.map((note) => note.text).join('\n') || null,
    medications: [
      mapMedication(
        resolved.name,
        resolved.medication,
        resource.dosage?.[0],
        statementStatus(resource.status),
      ),
    ],
  }
}

function mapMedicationDispense(
  resource: FhirMedicationDispense,
  patientId: string,
  medications: ReadonlyMap<string, FhirMedication>,
): ClinicalRecord | null {
  if (resource.status === 'entered-in-error') return null
  const resolved = medicationConcept(
    resource.medicationCodeableConcept,
    resource.medicationReference,
    medications,
  )

  return {
    id: stableRecordId(resource),
    patientId,
    recordedAt: normalizeTimestamp(
      resource.whenHandedOver ??
        resource.whenPrepared ??
        resource.meta?.lastUpdated,
    ),
    source: 'pharmacy',
    title: 'Medication dispense',
    author: referenceDisplay(resource.performer?.[0]?.actor),
    organization: null,
    note: resource.note?.map((note) => note.text).join('\n') || null,
    medications: [
      mapMedication(
        resolved.name,
        resolved.medication,
        resource.dosageInstruction?.[0],
        dispenseStatus(resource.status),
      ),
    ],
  }
}

function mapEncounter(
  resource: FhirEncounter,
  patientId: string,
): ClinicalRecord {
  const reason =
    resource.reasonCode?.map(conceptText).filter(Boolean).join('; ') || null
  const isHospital = ['EMER', 'IMP', 'ACUTE'].includes(
    resource.class.code ?? '',
  )

  return {
    id: stableRecordId(resource),
    patientId,
    recordedAt: normalizeTimestamp(
      resource.period?.start ??
        resource.period?.end ??
        resource.meta?.lastUpdated,
    ),
    source: isHospital ? 'hospital' : 'unknown',
    title: conceptText(resource.type?.[0]) ?? 'Clinical encounter',
    author: referenceDisplay(resource.participant?.[0]?.individual),
    organization: referenceDisplay(resource.serviceProvider),
    note: reason,
    medications: [],
  }
}

function mapDocument(
  resource: FhirDocumentReference,
  patientId: string,
): ClinicalRecord | null {
  if (resource.status === 'entered-in-error') return null
  const attachmentTitles = resource.content
    .map((content) => content.attachment.title?.trim())
    .filter((title): title is string => Boolean(title))
  const note = [resource.description?.trim(), ...attachmentTitles]
    .filter((text): text is string => Boolean(text))
    .join('; ')

  return {
    id: stableRecordId(resource),
    patientId,
    recordedAt: normalizeTimestamp(
      resource.date ??
        resource.content[0]?.attachment.creation ??
        resource.meta?.lastUpdated,
    ),
    source: 'unknown',
    title: conceptText(resource.type) ?? 'Clinical document',
    author: referenceDisplay(resource.author?.[0]),
    organization: null,
    note: note || null,
    medications: [],
  }
}

function recordTimestamp(record: ClinicalRecord) {
  if (!record.recordedAt) return Number.NEGATIVE_INFINITY
  const timestamp = Date.parse(record.recordedAt)
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

export function mapFhirReconciliationData(
  data: FhirReconciliationData,
): PatientContextResponse {
  if (!data.patient.id) {
    throw new Error('FHIR Patient is missing its logical ID.')
  }

  const patientId = data.patient.id
  const medications = medicationIndex(data.medications)
  const records = [
    ...data.medicationRequests.map((resource) =>
      mapMedicationRequest(resource, patientId, medications),
    ),
    ...data.medicationStatements.map((resource) =>
      mapMedicationStatement(resource, patientId, medications),
    ),
    ...data.medicationDispenses.map((resource) =>
      mapMedicationDispense(resource, patientId, medications),
    ),
    ...data.encounters.map((resource) => mapEncounter(resource, patientId)),
    ...data.documents.map((resource) => mapDocument(resource, patientId)),
  ]
    .filter((record): record is ClinicalRecord => Boolean(record))
    .toSorted((left, right) => recordTimestamp(right) - recordTimestamp(left))

  return {
    patient: mapFhirPatient(data.patient, {
      allergies: data.allergies,
      allergiesAvailable: true,
    }),
    records,
    notes: [],
  }
}
