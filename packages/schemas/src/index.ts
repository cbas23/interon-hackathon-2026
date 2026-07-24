import { z } from 'zod'

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const patientSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  mrn: z.string().min(1).nullable(),
  dateOfBirth: isoDateSchema.nullable(),
  sex: z.enum(['female', 'male', 'other', 'unknown']),
  pronouns: z.string().min(1).nullable(),
  allergies: z.array(z.string()),
  allergiesAvailable: z.boolean(),
  primaryCareProvider: z.string().min(1).nullable(),
})

export const patientSearchParamsSchema = z
  .object({
    name: z.string().trim().optional(),
    dateOfBirth: isoDateSchema.optional(),
    mrn: z.string().trim().optional(),
  })
  .refine((value) => Boolean(value.name || value.dateOfBirth || value.mrn), {
    message: 'Enter at least one search criterion.',
  })

export const patientSearchResponseSchema = z.object({
  patients: z.array(patientSchema),
  total: z.number().int().nonnegative().nullable(),
  hasMore: z.boolean(),
})

export const medicationSchema = z.object({
  name: z.string().min(1),
  strength: z.string().min(1).nullable(),
  dose: z.string().min(1).nullable(),
  route: z.string().min(1).nullable(),
  frequency: z.string().min(1).nullable(),
  status: z.enum(['active', 'discontinued', 'historical']),
})

export const clinicalRecordSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  recordedAt: z.string().nullable(),
  source: z.enum([
    'patient_report',
    'primary_care',
    'hospital',
    'pharmacy',
    'specialist',
    'unknown',
  ]),
  title: z.string().min(1),
  author: z.string().min(1).nullable(),
  organization: z.string().min(1).nullable(),
  note: z.string().min(1).nullable(),
  medications: z.array(medicationSchema),
})

export const patientNoteSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  createdAt: z.string(),
  author: z.string(),
  text: z.string().min(1),
})

export const patientContextResponseSchema = z.object({
  patient: patientSchema,
  records: z.array(clinicalRecordSchema),
  notes: z.array(patientNoteSchema),
})

export const createPatientNoteRequestSchema = z.object({
  text: z.string().trim().min(1).max(5000),
})

export const reconciliationFindingSchema = z.object({
  id: z.string().min(1),
  medicationName: z.string().min(1),
  severity: z.enum(['info', 'review', 'urgent']),
  type: z.enum([
    'match',
    'dose_mismatch',
    'frequency_mismatch',
    'missing_from_patient_report',
    'missing_from_record',
    'possible_safety_risk',
  ]),
  title: z.string().min(1),
  detail: z.string().min(1),
  recommendation: z.string().min(1),
  evidenceRecordIds: z.array(z.string().min(1)),
})

export const reconciliationAnalysisSchema = z.object({
  summary: z.string().min(1),
  reviewQuestions: z.array(z.string().min(1)),
  findings: z.array(reconciliationFindingSchema.omit({ id: true })),
})

export const reconciliationRequestSchema = z.object({
  currentMedicationNotes: z.string().trim().min(1).max(5000),
})

export const reconciliationResponseSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  generatedAt: z.string().min(1),
  status: z.literal('requires_clinician_review'),
  summary: z.string(),
  reviewQuestions: z.array(z.string()),
  findings: z.array(reconciliationFindingSchema),
  records: z.array(clinicalRecordSchema),
})

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1).optional(),
    issues: z
      .array(
        z.object({
          path: z.string(),
          message: z.string().min(1),
        }),
      )
      .optional(),
  }),
})

export type Patient = z.infer<typeof patientSchema>
export type PatientSearchParams = z.infer<typeof patientSearchParamsSchema>
export type PatientSearchResponse = z.infer<typeof patientSearchResponseSchema>
export type Medication = z.infer<typeof medicationSchema>
export type ClinicalRecord = z.infer<typeof clinicalRecordSchema>
export type PatientNote = z.infer<typeof patientNoteSchema>
export type PatientContextResponse = z.infer<
  typeof patientContextResponseSchema
>
export type CreatePatientNoteRequest = z.infer<
  typeof createPatientNoteRequestSchema
>
export type ReconciliationFinding = z.infer<typeof reconciliationFindingSchema>
export type ReconciliationAnalysis = z.infer<
  typeof reconciliationAnalysisSchema
>
export type ReconciliationRequest = z.infer<typeof reconciliationRequestSchema>
export type ReconciliationResponse = z.infer<
  typeof reconciliationResponseSchema
>
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>

export { z }
