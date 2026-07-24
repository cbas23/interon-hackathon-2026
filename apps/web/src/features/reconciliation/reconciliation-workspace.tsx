import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ScanSearch,
  Sparkles,
} from 'lucide-react'
import type {
  ClinicalRecord,
  Patient,
  ReconciliationFinding,
  ReconciliationResponse,
} from '@app/schemas'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { getPatientContext, runReconciliation } from '@/lib/api'

const sourceLabels: Record<ClinicalRecord['source'], string> = {
  patient_report: 'Patient report',
  primary_care: 'Primary care',
  hospital: 'Hospital',
  pharmacy: 'Pharmacy',
  specialist: 'Specialist',
  unknown: 'FHIR record',
}

function formatDate(date: string | null, includeTime = false) {
  if (!date) return 'Not recorded'
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return 'Not recorded'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    timeZone: 'UTC',
  }).format(value)
}

function getAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null
  const birthDate = new Date(`${dateOfBirth}T00:00:00Z`)
  const today = new Date()
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear()
  const monthDifference = today.getUTCMonth() - birthDate.getUTCMonth()

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1
  }

  return age
}

function PatientIdentity({ patient }: { patient: Patient }) {
  const initials = patient.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
  const age = getAge(patient.dateOfBirth)

  return (
    <section className="border-y bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-4">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary-foreground/30 font-mono text-sm font-semibold"
            aria-hidden="true"
          >
            {initials || '—'}
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight">
              {patient.displayName}
            </p>
            <p className="text-sm text-primary-foreground/75">
              {[
                patient.pronouns,
                age === null ? null : `${age} years`,
                `DOB ${formatDate(patient.dateOfBirth)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-primary-foreground/65">
              MRN
            </dt>
            <dd className="font-mono font-medium">
              {patient.mrn ?? 'Not recorded'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-primary-foreground/65">
              Allergies
            </dt>
            <dd className="font-medium">
              {!patient.allergiesAvailable
                ? 'Not reviewed'
                : patient.allergies.length > 0
                  ? patient.allergies.join(', ')
                  : 'None recorded'}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs uppercase tracking-wider text-primary-foreground/65">
              Primary care
            </dt>
            <dd className="font-medium">
              {patient.primaryCareProvider ?? 'Not recorded'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function FindingCard({ finding }: { finding: ReconciliationFinding }) {
  const variant =
    finding.severity === 'urgent'
      ? 'destructive'
      : finding.severity === 'review'
        ? 'secondary'
        : 'outline'
  const Icon = finding.severity === 'urgent' ? AlertTriangle : CheckCircle2

  return (
    <Card size="sm" className="bg-background">
      <CardHeader>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant={variant}>
            <Icon data-icon="inline-start" />
            {finding.severity === 'urgent'
              ? 'Safety review'
              : finding.severity === 'review'
                ? 'Confirm'
                : 'Aligned'}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            {finding.medicationName}
          </span>
        </div>
        <CardTitle>{finding.title}</CardTitle>
        <CardDescription className="leading-relaxed">
          {finding.detail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          <span className="font-medium">Next check:</span>{' '}
          {finding.recommendation}
        </p>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">Evidence</span>
        {finding.evidenceRecordIds.map((recordId) => (
          <a
            key={recordId}
            href={`#record-${recordId}`}
            className="rounded-sm font-mono text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-2"
          >
            {recordId.replace('rec-', '')}
          </a>
        ))}
      </CardFooter>
    </Card>
  )
}

function ClinicalRecordCard({ record }: { record: ClinicalRecord }) {
  const provenance = [
    formatDate(record.recordedAt, true),
    record.organization,
    record.author,
  ].filter((value): value is string => Boolean(value))

  return (
    <article id={`record-${record.id}`} className="scroll-mt-6">
      <Card className="bg-background">
        <CardHeader className="border-b">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{sourceLabels[record.source]}</Badge>
            <span className="font-mono text-xs text-muted-foreground">
              {record.id.replace('rec-', '')}
            </span>
          </div>
          <CardTitle>{record.title}</CardTitle>
          <CardDescription>{provenance.join(' · ')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {record.note ? (
            <p className="leading-relaxed text-muted-foreground">
              {record.note}
            </p>
          ) : null}
          {record.medications.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-xl text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Medication</th>
                    <th className="px-3 py-2 font-medium">Directions</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {record.medications.map((medication) => (
                    <tr key={`${medication.name}-${medication.strength}`}>
                      <td className="px-3 py-3 font-medium">
                        {medication.name}
                        {medication.strength ? ` ${medication.strength}` : ''}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {[
                          medication.dose,
                          medication.route,
                          medication.frequency,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Directions not recorded'}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={
                            medication.status === 'active'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {medication.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </article>
  )
}

function ReconciliationResults({ result }: { result: ReconciliationResponse }) {
  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-5">
          <div>
            <Badge variant="secondary">
              <Sparkles data-icon="inline-start" />
              AI-assisted review
            </Badge>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Reconciliation brief
            </h2>
          </div>
          <Card className="bg-primary text-primary-foreground ring-primary">
            <CardHeader>
              <CardTitle className="text-xl">Clinical summary</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                Generated {formatDate(result.generatedAt, true)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed">{result.summary}</p>
            </CardContent>
            <CardFooter className="border-primary-foreground/20 bg-primary-foreground/10">
              <p className="text-xs">
                Decision support only. Verify against source records and use
                clinical judgment before changing medications.
              </p>
            </CardFooter>
          </Card>

          <Card size="sm" className="bg-background">
            <CardHeader>
              <CardTitle>Questions for the patient</CardTitle>
            </CardHeader>
            <CardContent>
              {result.reviewQuestions.length > 0 ? (
                <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm leading-relaxed">
                  {result.reviewQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No follow-up questions were generated.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Source comparison</p>
              <p className="text-sm text-muted-foreground">
                {result.findings.length} findings across {result.records.length}{' '}
                records
              </p>
            </div>
            <Badge variant="outline">Clinician review required</Badge>
          </div>
          {result.findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
          {result.findings.length === 0 ? (
            <Card size="sm" className="bg-background">
              <CardHeader>
                <CardTitle>No discrepancies identified</CardTitle>
                <CardDescription>
                  Review the source records before finalizing the medication
                  list.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      </section>

      <section
        className="flex flex-col gap-6"
        aria-labelledby="record-ledger-title"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Evidence ledger
            </p>
            <h2
              id="record-ledger-title"
              className="text-3xl font-semibold tracking-tight"
            >
              All source records
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Records are shown newest first. Finding IDs above link back to the
            source used in the comparison.
          </p>
        </div>
        <div className="relative flex flex-col gap-5 before:absolute before:top-0 before:bottom-0 before:left-3 before:w-px before:bg-border sm:pl-9 sm:before:left-3">
          {result.records.map((record) => (
            <div key={record.id} className="relative">
              <span className="absolute top-6 -left-8 hidden size-3 rounded-full border-2 border-primary bg-background sm:block" />
              <ClinicalRecordCard record={record} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function ReconciliationWorkspace({
  patientId,
  onBack,
}: {
  patientId: string
  onBack: () => void
}) {
  const [currentMedicationNotes, setCurrentMedicationNotes] = useState('')
  const [notesError, setNotesError] = useState('')
  const context = useQuery({
    queryKey: ['patient-context', patientId],
    queryFn: () => getPatientContext(patientId),
  })
  const reconciliation = useMutation({
    mutationFn: (notes: string) =>
      runReconciliation(patientId, { currentMedicationNotes: notes }),
  })

  function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentMedicationNotes.trim()) {
      setNotesError('Add what the patient reports taking before scanning.')
      return
    }

    setNotesError('')
    reconciliation.reset()
    reconciliation.mutate(currentMedicationNotes.trim())
  }

  if (context.isPending) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-5 py-10 lg:px-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </main>
    )
  }

  if (context.isError) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-5 py-10">
        <Alert variant="destructive">
          <AlertTitle>Patient record unavailable</AlertTitle>
          <AlertDescription>{context.error.message}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back to search
        </Button>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Patient search
        </Button>
        <Badge variant="outline" className="font-mono">
          FHIR SOURCE
        </Badge>
      </div>

      <PatientIdentity patient={context.data.patient} />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-10 lg:px-8 lg:py-14">
        <section className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Step 1 · Patient report
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              What are they taking today?
            </h1>
            <p className="leading-relaxed text-muted-foreground">
              Record prescriptions, over-the-counter products, vitamins, dose,
              frequency, and anything the patient recently stopped.
            </p>
            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
              <FileText className="size-4" />
              {context.data.records.length} records available to scan
            </div>
            {context.data.records.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No usable source records are available. Reconciliation cannot
                  run for this patient.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <Card className="bg-background shadow-lg shadow-primary/5">
            <CardHeader className="border-b">
              <CardTitle>Current medication notes</CardTitle>
              <CardDescription>
                Enter the patient’s own report. The scan will compare this text
                with prior records.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleScan}>
              <CardContent>
                <Field data-invalid={Boolean(notesError)}>
                  <FieldLabel htmlFor="current-medications">
                    Patient-reported medications
                  </FieldLabel>
                  <Textarea
                    id="current-medications"
                    rows={8}
                    aria-invalid={Boolean(notesError)}
                    placeholder={
                      'Medication, strength, frequency\nInclude OTC products and recent changes'
                    }
                    value={currentMedicationNotes}
                    onChange={(event) =>
                      setCurrentMedicationNotes(event.target.value)
                    }
                  />
                  {notesError ? (
                    <FieldError>{notesError}</FieldError>
                  ) : (
                    <FieldDescription>
                      Separate each medication with a new line when possible.
                    </FieldDescription>
                  )}
                </Field>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    reconciliation.isPending ||
                    context.data.records.length === 0
                  }
                >
                  {reconciliation.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <ScanSearch data-icon="inline-start" />
                  )}
                  {reconciliation.isPending
                    ? 'Scanning source records…'
                    : reconciliation.data
                      ? 'Scan again'
                      : 'Scan records'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </section>

        {reconciliation.isPending ? (
          <section className="flex flex-col gap-5" aria-live="polite">
            <Separator />
            <div className="flex items-center gap-3">
              <ClipboardCheck className="size-5 text-primary" />
              <div>
                <p className="font-medium">Comparing medication sources</p>
                <p className="text-sm text-muted-foreground">
                  Reviewing doses, status changes, prior notes, and safety
                  flags.
                </p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          </section>
        ) : null}

        {reconciliation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Scan could not be completed</AlertTitle>
            <AlertDescription>{reconciliation.error.message}</AlertDescription>
          </Alert>
        ) : null}

        {reconciliation.data ? (
          <>
            <Separator />
            <ReconciliationResults result={reconciliation.data} />
          </>
        ) : null}
      </div>
    </main>
  )
}
