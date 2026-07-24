import type {
  FhirBundle,
  FhirOperationOutcome,
  FhirResource,
  FhirSearchParameters,
  FhirSearchResult,
} from './types'

export interface FhirClientOptions {
  baseUrl: string
  headers?: Record<string, string>
  requestTimeoutMs?: number
  maxPages?: number
  maxResources?: number
  fetch?: typeof fetch
}

export interface FhirRequestOptions {
  signal?: AbortSignal
}

export interface FhirSearchOptions extends FhirRequestOptions {
  maxPages?: number
  maxResources?: number
}

interface FhirClientErrorOptions {
  status?: number
  requestUrl: string
  outcome?: FhirOperationOutcome
  cause?: unknown
}

interface FhirSearchPage<
  TResource extends FhirResource,
> extends FhirSearchResult<TResource> {
  bundle: FhirBundle<FhirResource>
}

export class FhirClientError extends Error {
  readonly status?: number
  readonly requestUrl: string
  readonly outcome?: FhirOperationOutcome

  constructor(message: string, options: FhirClientErrorOptions) {
    super(message, { cause: options.cause })
    this.name = 'FhirClientError'
    this.status = options.status
    this.requestUrl = options.requestUrl
    this.outcome = options.outcome
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFhirResource(value: unknown): value is FhirResource {
  return isRecord(value) && typeof value.resourceType === 'string'
}

function isOperationOutcome(value: unknown): value is FhirOperationOutcome {
  return (
    isFhirResource(value) &&
    value.resourceType === 'OperationOutcome' &&
    Array.isArray((value as unknown as Record<string, unknown>).issue)
  )
}

function getOutcomeMessage(outcome: FhirOperationOutcome | undefined) {
  return outcome?.issue
    .map((issue) => issue.diagnostics ?? issue.details?.text)
    .filter((message): message is string => Boolean(message))
    .join(' ')
}

function appendSearchParameters(url: URL, parameters: FhirSearchParameters) {
  for (const [name, value] of Object.entries(parameters)) {
    if (value === undefined || value === null) {
      continue
    }

    const values = Array.isArray(value) ? value : [value]

    for (const item of values) {
      url.searchParams.append(name, String(item))
    }
  }
}

export class FhirClient {
  private readonly baseUrl: URL
  private readonly headers: Headers
  private readonly requestTimeoutMs: number
  private readonly maxPages: number
  private readonly maxResources: number
  private readonly fetchImplementation: typeof fetch

  constructor(options: FhirClientOptions) {
    this.baseUrl = new URL(`${options.baseUrl.replace(/\/+$/, '')}/`)
    this.headers = new Headers(options.headers)
    this.headers.set('Accept', 'application/fhir+json')
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000
    this.maxPages = options.maxPages ?? 10
    this.maxResources = options.maxResources ?? 500
    this.fetchImplementation = options.fetch ?? fetch
  }

  async read<TResource extends FhirResource>(
    resourceType: TResource['resourceType'],
    id: string,
    options: FhirRequestOptions = {},
  ): Promise<TResource> {
    const url = this.resourceUrl(resourceType, id)
    const resource = await this.request(url, options.signal)

    if (!isFhirResource(resource) || resource.resourceType !== resourceType) {
      throw new FhirClientError(
        `Expected a ${resourceType} resource from the FHIR server.`,
        { requestUrl: this.safeRequestUrl(url) },
      )
    }

    return resource as TResource
  }

  async search<TResource extends FhirResource>(
    resourceType: TResource['resourceType'],
    parameters: FhirSearchParameters = {},
    options: FhirRequestOptions = {},
  ): Promise<FhirSearchResult<TResource>> {
    const url = this.resourceUrl(resourceType)
    appendSearchParameters(url, parameters)

    return this.searchPage<TResource>(resourceType, url, options.signal)
  }

  async searchAll<TResource extends FhirResource>(
    resourceType: TResource['resourceType'],
    parameters: FhirSearchParameters = {},
    options: FhirSearchOptions = {},
  ): Promise<FhirSearchResult<TResource>> {
    const maxPages = options.maxPages ?? this.maxPages
    const maxResources = options.maxResources ?? this.maxResources
    const initialUrl = this.resourceUrl(resourceType)
    appendSearchParameters(initialUrl, parameters)

    const resources: TResource[] = []
    const included: FhirResource[] = []
    let nextUrl: URL | undefined = initialUrl
    let total: number | undefined
    let pageCount = 0
    const visitedUrls = new Set<string>()

    while (nextUrl && pageCount < maxPages) {
      const paginationKey = nextUrl.toString()

      if (visitedUrls.has(paginationKey)) {
        throw new FhirClientError(
          'FHIR server returned a repeated pagination URL.',
          { requestUrl: this.safeRequestUrl(nextUrl) },
        )
      }

      visitedUrls.add(paginationKey)
      const page: FhirSearchPage<TResource> = await this.searchPage<TResource>(
        resourceType,
        nextUrl,
        options.signal,
      )
      resources.push(...page.resources)
      included.push(...page.included)
      total ??= page.total
      pageCount += 1

      if (resources.length + included.length > maxResources) {
        throw new FhirClientError(
          `FHIR search exceeded the ${maxResources} resource safety limit.`,
          { requestUrl: this.safeRequestUrl(nextUrl) },
        )
      }

      const bundle: FhirBundle<FhirResource> = page.bundle
      const nextLink = bundle.link?.find((link) => link.relation === 'next')
      nextUrl = nextLink ? this.validatePaginationUrl(nextLink.url) : undefined
    }

    if (nextUrl) {
      throw new FhirClientError(
        `FHIR search exceeded the ${maxPages} page safety limit.`,
        { requestUrl: this.safeRequestUrl(nextUrl) },
      )
    }

    return { resources, included, total, pageCount, hasMore: false }
  }

  private async searchPage<TResource extends FhirResource>(
    expectedResourceType: TResource['resourceType'],
    url: URL,
    signal?: AbortSignal,
  ): Promise<FhirSearchPage<TResource>> {
    const value = await this.request(url, signal)

    if (!isFhirResource(value) || value.resourceType !== 'Bundle') {
      throw new FhirClientError(
        'Expected a FHIR Bundle from the search request.',
        { requestUrl: this.safeRequestUrl(url) },
      )
    }

    const bundle = value as FhirBundle<FhirResource>

    if (bundle.type !== 'searchset') {
      throw new FhirClientError(
        `Expected a searchset Bundle, received "${bundle.type}".`,
        { requestUrl: this.safeRequestUrl(url) },
      )
    }

    const resources: TResource[] = []
    const included: FhirResource[] = []

    for (const entry of bundle.entry ?? []) {
      if (!entry.resource) {
        continue
      }

      if (entry.search?.mode === 'outcome') {
        continue
      }

      if (entry.search?.mode === 'include') {
        included.push(entry.resource)
        continue
      }

      if (entry.resource.resourceType !== expectedResourceType) {
        throw new FhirClientError(
          `FHIR search returned ${entry.resource.resourceType} where ${expectedResourceType} was expected.`,
          { requestUrl: this.safeRequestUrl(url) },
        )
      }

      resources.push(entry.resource as TResource)
    }

    return {
      resources,
      included,
      total: bundle.total,
      pageCount: 1,
      hasMore: Boolean(bundle.link?.some((link) => link.relation === 'next')),
      bundle,
    }
  }

  private resourceUrl(resourceType: string, id?: string) {
    const path = id
      ? `${encodeURIComponent(resourceType)}/${encodeURIComponent(id)}`
      : encodeURIComponent(resourceType)

    return new URL(path, this.baseUrl)
  }

  private validatePaginationUrl(value: string) {
    const url = new URL(value, this.baseUrl)
    const basePath = this.baseUrl.pathname.replace(/\/$/, '')
    const isWithinBasePath =
      url.pathname === basePath || url.pathname.startsWith(`${basePath}/`)

    if (url.origin !== this.baseUrl.origin || !isWithinBasePath) {
      throw new FhirClientError(
        'FHIR server returned a pagination URL outside the configured base URL.',
        { requestUrl: this.safeRequestUrl(url) },
      )
    }

    return url
  }

  private safeRequestUrl(url: URL) {
    return `${url.origin}${url.pathname}`
  }

  private async request(url: URL, signal?: AbortSignal): Promise<unknown> {
    const timeoutController = new AbortController()
    const timeout = setTimeout(
      () => timeoutController.abort(new Error('FHIR request timed out.')),
      this.requestTimeoutMs,
    )
    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal
    const requestUrl = this.safeRequestUrl(url)

    try {
      const response = await this.fetchImplementation(url, {
        method: 'GET',
        headers: this.headers,
        signal: requestSignal,
      })
      const text = await response.text()
      let body: unknown

      try {
        body = text ? JSON.parse(text) : undefined
      } catch (error) {
        throw new FhirClientError(
          'FHIR server returned a response that was not valid JSON.',
          { status: response.status, requestUrl, cause: error },
        )
      }

      const outcome = isOperationOutcome(body) ? body : undefined

      if (!response.ok) {
        const diagnostics = getOutcomeMessage(outcome)
        throw new FhirClientError(
          diagnostics || `FHIR request failed with status ${response.status}.`,
          { status: response.status, requestUrl, outcome },
        )
      }

      return body
    } catch (error) {
      if (error instanceof FhirClientError) {
        throw error
      }

      const message = requestSignal.aborted
        ? 'FHIR request was cancelled or timed out.'
        : 'FHIR request failed before receiving a response.'

      throw new FhirClientError(message, { requestUrl, cause: error })
    } finally {
      clearTimeout(timeout)
    }
  }
}
