const DEFAULT_FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'

function positiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received "${value}".`)
  }

  return parsed
}

function normalizeBaseUrl(value: string) {
  const url = new URL(value)

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('FHIR_BASE_URL must use HTTP or HTTPS.')
  }

  url.hash = ''
  url.search = ''
  url.pathname = url.pathname.replace(/\/+$/, '')

  return url.toString().replace(/\/$/, '')
}

export const fhirConfig = {
  baseUrl: normalizeBaseUrl(process.env.FHIR_BASE_URL ?? DEFAULT_FHIR_BASE_URL),
  requestTimeoutMs: positiveInteger(
    process.env.FHIR_REQUEST_TIMEOUT_MS,
    15_000,
  ),
  maxPages: positiveInteger(process.env.FHIR_MAX_PAGES, 10),
  maxResources: positiveInteger(process.env.FHIR_MAX_RESOURCES, 500),
  mrnSystem: process.env.FHIR_MRN_SYSTEM?.trim() || undefined,
} as const
