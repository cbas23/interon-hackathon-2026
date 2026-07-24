import {
  patientSearchParamsSchema,
  reconciliationRequestSchema,
  z,
} from '@app/schemas'
import { Hono } from 'hono'

import { AppError } from '../http/errors'
import { getPatientContext, searchPatients } from '../services/patient-service'
import { reconcilePatient } from '../services/reconciliation-service'

const patientIdSchema = z.string().trim().min(1).max(200)

function validationError(error: z.ZodError) {
  return new AppError('VALIDATION_ERROR', 400, 'Request validation failed.', {
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  })
}

export const patientRoutes = new Hono()
  .get('/', async (c) => {
    const parsed = patientSearchParamsSchema.safeParse({
      name: c.req.query('name'),
      dateOfBirth: c.req.query('dateOfBirth'),
      mrn: c.req.query('mrn'),
    })

    if (!parsed.success) throw validationError(parsed.error)
    const response = await searchPatients(parsed.data, {
      signal: c.req.raw.signal,
    })
    return c.json(response)
  })
  .get('/:patientId/context', async (c) => {
    const parsedId = patientIdSchema.safeParse(c.req.param('patientId'))
    if (!parsedId.success) throw validationError(parsedId.error)
    const response = await getPatientContext(parsedId.data, {
      signal: c.req.raw.signal,
    })
    return c.json(response)
  })
  .post('/:patientId/reconciliations', async (c) => {
    const parsedId = patientIdSchema.safeParse(c.req.param('patientId'))
    if (!parsedId.success) throw validationError(parsedId.error)

    let body: unknown
    try {
      body = await c.req.json()
    } catch (error) {
      throw new AppError(
        'INVALID_JSON',
        400,
        'Request body must be valid JSON.',
        {
          cause: error,
        },
      )
    }

    const parsedBody = reconciliationRequestSchema.safeParse(body)
    if (!parsedBody.success) throw validationError(parsedBody.error)
    const response = await reconcilePatient(parsedId.data, parsedBody.data, {
      signal: c.req.raw.signal,
    })
    return c.json(response)
  })
