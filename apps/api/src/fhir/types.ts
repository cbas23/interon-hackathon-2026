export type FhirResourceType =
  | 'AllergyIntolerance'
  | 'Bundle'
  | 'DocumentReference'
  | 'Encounter'
  | 'Medication'
  | 'MedicationDispense'
  | 'MedicationRequest'
  | 'MedicationStatement'
  | 'OperationOutcome'
  | 'Organization'
  | 'Patient'
  | 'Practitioner'

export interface FhirMeta {
  versionId?: string
  lastUpdated?: string
  source?: string
  profile?: string[]
  tag?: FhirCoding[]
}

export interface FhirResource {
  resourceType: FhirResourceType | (string & {})
  id?: string
  meta?: FhirMeta
  implicitRules?: string
  language?: string
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old'
  type?: FhirCodeableConcept
  system?: string
  value?: string
  period?: FhirPeriod
  assigner?: FhirReference
}

export interface FhirHumanName {
  use?:
    'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden'
  text?: string
  family?: string
  given?: string[]
  prefix?: string[]
  suffix?: string[]
  period?: FhirPeriod
}

export interface FhirReference<TType extends string = string> {
  reference?: `${TType}/${string}` | string
  type?: string
  identifier?: FhirIdentifier
  display?: string
}

export interface FhirCoding {
  system?: string
  version?: string
  code?: string
  display?: string
  userSelected?: boolean
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[]
  text?: string
}

export interface FhirPeriod {
  start?: string
  end?: string
}

export interface FhirQuantity {
  value?: number
  comparator?: '<' | '<=' | '>=' | '>'
  unit?: string
  system?: string
  code?: string
}

export interface FhirRange {
  low?: FhirQuantity
  high?: FhirQuantity
}

export interface FhirRatio {
  numerator?: FhirQuantity
  denominator?: FhirQuantity
}

export interface FhirAnnotation {
  authorReference?: FhirReference
  authorString?: string
  time?: string
  text: string
}

export interface FhirAttachment {
  contentType?: string
  language?: string
  data?: string
  url?: string
  size?: number
  hash?: string
  title?: string
  creation?: string
}

export interface FhirTimingRepeat {
  boundsPeriod?: FhirPeriod
  count?: number
  countMax?: number
  duration?: number
  durationMax?: number
  durationUnit?: string
  frequency?: number
  frequencyMax?: number
  period?: number
  periodMax?: number
  periodUnit?: string
  dayOfWeek?: string[]
  timeOfDay?: string[]
  when?: string[]
  offset?: number
}

export interface FhirTiming {
  event?: string[]
  repeat?: FhirTimingRepeat
  code?: FhirCodeableConcept
}

export interface FhirDosageDoseAndRate {
  type?: FhirCodeableConcept
  doseRange?: FhirRange
  doseQuantity?: FhirQuantity
  rateRatio?: FhirRatio
  rateRange?: FhirRange
  rateQuantity?: FhirQuantity
}

export interface FhirDosage {
  sequence?: number
  text?: string
  additionalInstruction?: FhirCodeableConcept[]
  patientInstruction?: string
  timing?: FhirTiming
  asNeededBoolean?: boolean
  asNeededCodeableConcept?: FhirCodeableConcept
  site?: FhirCodeableConcept
  route?: FhirCodeableConcept
  method?: FhirCodeableConcept
  doseAndRate?: FhirDosageDoseAndRate[]
  maxDosePerPeriod?: FhirRatio
  maxDosePerAdministration?: FhirQuantity
  maxDosePerLifetime?: FhirQuantity
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient'
  identifier?: FhirIdentifier[]
  active?: boolean
  name?: FhirHumanName[]
  gender?: 'male' | 'female' | 'other' | 'unknown'
  birthDate?: string
  deceasedBoolean?: boolean
  deceasedDateTime?: string
  generalPractitioner?: FhirReference<
    'Organization' | 'Practitioner' | 'PractitionerRole'
  >[]
  managingOrganization?: FhirReference<'Organization'>
}

export interface FhirAllergyIntoleranceReaction {
  substance?: FhirCodeableConcept
  manifestation: FhirCodeableConcept[]
  description?: string
  onset?: string
  severity?: 'mild' | 'moderate' | 'severe'
  exposureRoute?: FhirCodeableConcept
  note?: FhirAnnotation[]
}

export interface FhirAllergyIntolerance extends FhirResource {
  resourceType: 'AllergyIntolerance'
  identifier?: FhirIdentifier[]
  clinicalStatus?: FhirCodeableConcept
  verificationStatus?: FhirCodeableConcept
  type?: 'allergy' | 'intolerance'
  category?: ('food' | 'medication' | 'environment' | 'biologic')[]
  criticality?: 'low' | 'high' | 'unable-to-assess'
  code?: FhirCodeableConcept
  patient: FhirReference<'Patient'>
  encounter?: FhirReference<'Encounter'>
  onsetDateTime?: string
  onsetAge?: FhirQuantity
  onsetPeriod?: FhirPeriod
  onsetRange?: FhirRange
  onsetString?: string
  recordedDate?: string
  recorder?: FhirReference<'Practitioner' | 'PractitionerRole'>
  asserter?: FhirReference<
    'Patient' | 'Practitioner' | 'PractitionerRole' | 'RelatedPerson'
  >
  lastOccurrence?: string
  note?: FhirAnnotation[]
  reaction?: FhirAllergyIntoleranceReaction[]
}

export interface FhirMedicationIngredient {
  itemCodeableConcept?: FhirCodeableConcept
  itemReference?: FhirReference<'Medication' | 'Substance'>
  isActive?: boolean
  strength?: FhirRatio
}

export interface FhirMedication extends FhirResource {
  resourceType: 'Medication'
  identifier?: FhirIdentifier[]
  code?: FhirCodeableConcept
  status?: 'active' | 'inactive' | 'entered-in-error'
  manufacturer?: FhirReference<'Organization'>
  form?: FhirCodeableConcept
  amount?: FhirRatio
  ingredient?: FhirMedicationIngredient[]
}

export interface FhirMedicationRequestDispenseRequest {
  validityPeriod?: FhirPeriod
  numberOfRepeatsAllowed?: number
  quantity?: FhirQuantity
  expectedSupplyDuration?: FhirQuantity
  performer?: FhirReference<'Organization'>
}

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest'
  identifier?: FhirIdentifier[]
  status:
    | 'active'
    | 'on-hold'
    | 'cancelled'
    | 'completed'
    | 'entered-in-error'
    | 'stopped'
    | 'draft'
    | 'unknown'
  statusReason?: FhirCodeableConcept
  intent:
    | 'proposal'
    | 'plan'
    | 'order'
    | 'original-order'
    | 'reflex-order'
    | 'filler-order'
    | 'instance-order'
    | 'option'
  category?: FhirCodeableConcept[]
  priority?: 'routine' | 'urgent' | 'asap' | 'stat'
  medicationCodeableConcept?: FhirCodeableConcept
  medicationReference?: FhirReference<'Medication'>
  subject: FhirReference<'Patient' | 'Group'>
  encounter?: FhirReference<'Encounter'>
  authoredOn?: string
  requester?: FhirReference<
    | 'Practitioner'
    | 'PractitionerRole'
    | 'Organization'
    | 'Patient'
    | 'RelatedPerson'
    | 'Device'
  >
  reasonCode?: FhirCodeableConcept[]
  reasonReference?: FhirReference<'Condition' | 'Observation'>[]
  note?: FhirAnnotation[]
  dosageInstruction?: FhirDosage[]
  dispenseRequest?: FhirMedicationRequestDispenseRequest
}

export interface FhirMedicationStatement extends FhirResource {
  resourceType: 'MedicationStatement'
  identifier?: FhirIdentifier[]
  status:
    | 'active'
    | 'completed'
    | 'entered-in-error'
    | 'intended'
    | 'stopped'
    | 'on-hold'
    | 'unknown'
    | 'not-taken'
  statusReason?: FhirCodeableConcept[]
  category?: FhirCodeableConcept
  medicationCodeableConcept?: FhirCodeableConcept
  medicationReference?: FhirReference<'Medication'>
  subject: FhirReference<'Patient' | 'Group'>
  context?: FhirReference<'Encounter' | 'EpisodeOfCare'>
  effectiveDateTime?: string
  effectivePeriod?: FhirPeriod
  dateAsserted?: string
  informationSource?: FhirReference<
    | 'Patient'
    | 'Practitioner'
    | 'PractitionerRole'
    | 'RelatedPerson'
    | 'Organization'
  >
  reasonCode?: FhirCodeableConcept[]
  reasonReference?: FhirReference<
    'Condition' | 'Observation' | 'DiagnosticReport'
  >[]
  note?: FhirAnnotation[]
  dosage?: FhirDosage[]
}

export interface FhirMedicationDispensePerformer {
  function?: FhirCodeableConcept
  actor: FhirReference<
    | 'Practitioner'
    | 'PractitionerRole'
    | 'Organization'
    | 'Patient'
    | 'Device'
    | 'RelatedPerson'
  >
}

export interface FhirMedicationDispense extends FhirResource {
  resourceType: 'MedicationDispense'
  identifier?: FhirIdentifier[]
  status:
    | 'preparation'
    | 'in-progress'
    | 'cancelled'
    | 'on-hold'
    | 'completed'
    | 'entered-in-error'
    | 'stopped'
    | 'declined'
    | 'unknown'
  statusReasonCodeableConcept?: FhirCodeableConcept
  medicationCodeableConcept?: FhirCodeableConcept
  medicationReference?: FhirReference<'Medication'>
  subject?: FhirReference<'Patient' | 'Group'>
  context?: FhirReference<'Encounter' | 'EpisodeOfCare'>
  performer?: FhirMedicationDispensePerformer[]
  authorizingPrescription?: FhirReference<'MedicationRequest'>[]
  type?: FhirCodeableConcept
  quantity?: FhirQuantity
  daysSupply?: FhirQuantity
  whenPrepared?: string
  whenHandedOver?: string
  dosageInstruction?: FhirDosage[]
  note?: FhirAnnotation[]
}

export interface FhirEncounterParticipant {
  type?: FhirCodeableConcept[]
  period?: FhirPeriod
  individual?: FhirReference<
    'Practitioner' | 'PractitionerRole' | 'RelatedPerson'
  >
}

export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter'
  identifier?: FhirIdentifier[]
  status:
    | 'planned'
    | 'arrived'
    | 'triaged'
    | 'in-progress'
    | 'onleave'
    | 'finished'
    | 'cancelled'
    | 'entered-in-error'
    | 'unknown'
  class: FhirCoding
  type?: FhirCodeableConcept[]
  serviceType?: FhirCodeableConcept
  priority?: FhirCodeableConcept
  subject?: FhirReference<'Patient' | 'Group'>
  participant?: FhirEncounterParticipant[]
  period?: FhirPeriod
  reasonCode?: FhirCodeableConcept[]
  serviceProvider?: FhirReference<'Organization'>
}

export interface FhirPractitioner extends FhirResource {
  resourceType: 'Practitioner'
  identifier?: FhirIdentifier[]
  active?: boolean
  name?: FhirHumanName[]
  qualification?: {
    identifier?: FhirIdentifier[]
    code: FhirCodeableConcept
    period?: FhirPeriod
    issuer?: FhirReference<'Organization'>
  }[]
}

export interface FhirOrganization extends FhirResource {
  resourceType: 'Organization'
  identifier?: FhirIdentifier[]
  active?: boolean
  type?: FhirCodeableConcept[]
  name?: string
  alias?: string[]
  partOf?: FhirReference<'Organization'>
}

export interface FhirDocumentReferenceContent {
  attachment: FhirAttachment
  format?: FhirCoding
}

export interface FhirDocumentReferenceContext {
  encounter?: FhirReference<'Encounter' | 'EpisodeOfCare'>[]
  period?: FhirPeriod
  facilityType?: FhirCodeableConcept
  practiceSetting?: FhirCodeableConcept
  sourcePatientInfo?: FhirReference<'Patient'>
}

export interface FhirDocumentReference extends FhirResource {
  resourceType: 'DocumentReference'
  masterIdentifier?: FhirIdentifier
  identifier?: FhirIdentifier[]
  status: 'current' | 'superseded' | 'entered-in-error'
  docStatus?: 'preliminary' | 'final' | 'amended' | 'entered-in-error'
  type?: FhirCodeableConcept
  category?: FhirCodeableConcept[]
  subject?: FhirReference<'Patient' | 'Practitioner' | 'Group' | 'Device'>
  date?: string
  author?: FhirReference<
    | 'Practitioner'
    | 'PractitionerRole'
    | 'Organization'
    | 'Device'
    | 'Patient'
    | 'RelatedPerson'
  >[]
  description?: string
  content: FhirDocumentReferenceContent[]
  context?: FhirDocumentReferenceContext
}

export interface FhirBundleLink {
  relation: 'self' | 'first' | 'previous' | 'next' | 'last' | (string & {})
  url: string
}

export interface FhirBundleEntry<
  TResource extends FhirResource = FhirResource,
> {
  fullUrl?: string
  resource?: TResource
  search?: {
    mode?: 'match' | 'include' | 'outcome'
    score?: number
  }
}

export interface FhirBundle<
  TResource extends FhirResource = FhirResource,
> extends FhirResource {
  resourceType: 'Bundle'
  type:
    | 'document'
    | 'message'
    | 'transaction'
    | 'transaction-response'
    | 'batch'
    | 'batch-response'
    | 'history'
    | 'searchset'
    | 'collection'
  total?: number
  link?: FhirBundleLink[]
  entry?: FhirBundleEntry<TResource>[]
}

export interface FhirOperationOutcomeIssue {
  severity: 'fatal' | 'error' | 'warning' | 'information'
  code: string
  details?: FhirCodeableConcept
  diagnostics?: string
  location?: string[]
  expression?: string[]
}

export interface FhirOperationOutcome extends FhirResource {
  resourceType: 'OperationOutcome'
  issue: FhirOperationOutcomeIssue[]
}

export interface FhirSearchResult<TResource extends FhirResource> {
  resources: TResource[]
  included: FhirResource[]
  total?: number
  pageCount: number
  hasMore: boolean
}

export type FhirSearchParameterValue =
  | string
  | number
  | boolean
  | readonly (string | number | boolean)[]
  | null
  | undefined

export type FhirSearchParameters = Record<string, FhirSearchParameterValue>
