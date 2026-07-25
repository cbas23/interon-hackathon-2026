import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Search } from 'lucide-react'
import {
  patientSearchParamsSchema,
  type Patient,
  type PatientSearchParams,
} from '@app/schemas'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { searchPatients } from '@/lib/api'

type SearchForm = {
  name: string
  dateOfBirth: string
  mrn: string
}

const emptyForm: SearchForm = { name: '', dateOfBirth: '', mrn: '' }

function formatDate(date: string | null) {
  if (!date) return 'Not recorded'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function PatientResult({
  patient,
  onSelect,
}: {
  patient: Patient
  onSelect: (patientId: string) => void
}) {
  return (
    <Card size="sm" className="bg-background">
      <CardHeader>
        <CardTitle>{patient.displayName}</CardTitle>
        <CardDescription>
          DOB {formatDate(patient.dateOfBirth)} ·{' '}
          {patient.mrn ?? 'MRN not recorded'}
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            aria-label={`Open reconciliation for ${patient.displayName}`}
            onClick={() => onSelect(patient.id)}
          >
            Open patient
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="outline">{patient.sex}</Badge>
        <Badge
          variant={
            patient.allergiesAvailable && patient.allergies.length > 0
              ? 'secondary'
              : 'outline'
          }
        >
          {!patient.allergiesAvailable
            ? 'Allergies not yet reviewed'
            : patient.allergies.length > 0
              ? `${patient.allergies.length} allergies`
              : 'No known allergies'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          PCP: {patient.primaryCareProvider ?? 'Not recorded'}
        </span>
      </CardContent>
    </Card>
  )
}

export function PatientSearch({
  onSelect,
}: {
  onSelect: (patientId: string) => void
}) {
  const [form, setForm] = useState<SearchForm>(emptyForm)
  const [validationError, setValidationError] = useState('')
  const search = useMutation({
    mutationFn: (criteria: PatientSearchParams) => searchPatients(criteria),
  })

  function submitCriteria(criteria: SearchForm) {
    const cleaned: PatientSearchParams = {
      name: criteria.name.trim() || undefined,
      dateOfBirth: criteria.dateOfBirth || undefined,
      mrn: criteria.mrn.trim() || undefined,
    }
    const parsed = patientSearchParamsSchema.safeParse(cleaned)

    if (!parsed.success) {
      setValidationError('Enter a name, date of birth, or MRN to search.')
      return
    }

    setValidationError('')
    search.mutate(parsed.data)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitCriteria(form)
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-10 px-5 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8 lg:py-20">
      <section className="flex flex-col gap-8 lg:sticky lg:top-12">
        <div className="flex flex-col gap-4">
          <h1 className="max-w-xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">
            Start with the right patient.
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            Find a patient, capture what they are taking today, and compare it
            against every available source record.
          </p>
        </div>
      </section>

      <section
        className="flex min-w-0 flex-col gap-5"
        aria-labelledby="search-title"
      >
        <Card className="bg-background shadow-lg shadow-primary/5">
          <CardHeader className="border-b">
            <CardTitle id="search-title" className="text-xl">
              Patient search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="patient-name">Patient name</FieldLabel>
                  <Input
                    id="patient-name"
                    autoComplete="off"
                    placeholder="e.g. Sarah Thompson"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-dob">Date of birth</FieldLabel>
                  <Input
                    id="patient-dob"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dateOfBirth: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-mrn">MRN</FieldLabel>
                  <Input
                    id="patient-mrn"
                    autoComplete="off"
                    placeholder="Medical record number"
                    value={form.mrn}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        mrn: event.target.value,
                      }))
                    }
                  />
                </Field>
              </FieldGroup>

              {validationError ? (
                <FieldError>{validationError}</FieldError>
              ) : (
                <FieldDescription>
                  {' '}
                  {/*FHIR identifier searches are exact. Combine fields to narrow
                  broad name searches.*/}
                </FieldDescription>
              )}

              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={search.isPending}>
                  <Search data-icon="inline-start" />
                  {search.isPending ? 'Searching records…' : 'Search patients'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {search.isPending ? (
          <div className="flex flex-col gap-3" aria-label="Searching patients">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}

        {search.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{search.error.message}</AlertDescription>
          </Alert>
        ) : null}

        {search.data ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                {search.data.patients.length === 0
                  ? 'No matching patients'
                  : search.data.total !== null
                    ? `${search.data.total} patient${search.data.total === 1 ? '' : 's'} found`
                    : `${search.data.patients.length}${search.data.hasMore ? '+' : ''} patients shown`}
              </h2>
              <span className="text-xs text-muted-foreground">
                Verify two identifiers
              </span>
            </div>
            {search.data.hasMore ? (
              <Alert>
                <AlertDescription>
                  More patients match this search. Add another identifier to
                  narrow the results.
                </AlertDescription>
              </Alert>
            ) : null}
            {search.data.patients.length === 0 ? (
              <Card size="sm" className="bg-background">
                <CardHeader>
                  <CardTitle>Check the search details</CardTitle>
                  <CardDescription>
                    Try fewer criteria, confirm the spelling, or verify the MRN.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              search.data.patients.map((patient) => (
                <PatientResult
                  key={patient.id}
                  patient={patient}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>
        ) : null}
      </section>
    </main>
  )
}
