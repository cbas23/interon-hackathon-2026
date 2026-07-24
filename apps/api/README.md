# API

Hono API shared by the local Node server and AWS Lambda adapter.

## Development

From the repository root:

```bash
bun install
bun run dev:api
```

The local API runs at `http://localhost:3001`.

## Environment

Copy `.env.example` to `.env` and provide the OpenRouter key. The public HAPI
FHIR R4 test server is the default data source and must not receive real PHI.

## Verification

```bash
bun --cwd apps/api lint
bun --cwd apps/api typecheck
bun --cwd apps/api build
```
