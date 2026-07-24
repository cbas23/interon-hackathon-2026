import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { StatusCode } from 'hono/utils/http-status'

import { apiErrorResponse, AppError } from './http/errors'
import { patientRoutes } from './routes/patients'

const allowedOrigins = (
  process.env.WEB_ALLOWED_ORIGINS ?? 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = new Hono()
  .basePath('/api')
  .use('*', async (c, next) => {
    const requestId = randomUUID()
    const startedAt = performance.now()
    c.header('X-Request-Id', requestId)

    try {
      await next()
    } finally {
      const pathname = new URL(c.req.url).pathname
      const duration = Math.round(performance.now() - startedAt)
      console.log(
        `${c.req.method} ${pathname} ${c.res.status} ${duration}ms ${requestId}`,
      )
    }
  })
  .use(
    '*',
    cors({
      origin: allowedOrigins,
    }),
  )
  .get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  })
  .route('/patients', patientRoutes)

app.onError((error, c) => {
  const requestId = c.res.headers.get('X-Request-Id') ?? randomUUID()
  const appError =
    error instanceof AppError
      ? error
      : new AppError(
          'INTERNAL_ERROR',
          500,
          'An unexpected server error occurred.',
          { cause: error },
        )

  console.error(
    `Request ${requestId} failed: ${appError.code} (${appError.cause instanceof Error ? appError.cause.name : appError.name})`,
  )
  c.status(appError.status as StatusCode)
  return c.json(apiErrorResponse(appError, requestId))
})

export { app }
