# API

Hono API served locally by Node and deployed as a Cloudflare Worker.

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

## Cloudflare deployment

The public API Worker is named `recmeds-api`. Configure the production web
origin in `wrangler.jsonc`, upload the OpenRouter key, and deploy from the
repository root:

```bash
bunx wrangler secret put OPENROUTER_API_KEY --config apps/api/wrangler.jsonc
bun run deploy:api
```
