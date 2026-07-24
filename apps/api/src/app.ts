import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()
  .basePath('/api')
  .use('*', logger())
  .use(
    '*',
    cors({
      origin: ['http://localhost:5173'],
    }),
  )
  .get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  })
  .get('/hello', (c) => {
    return c.json({
      message: 'Hello from Hono on AWS Lambda!',
    })
  })

export { app }
