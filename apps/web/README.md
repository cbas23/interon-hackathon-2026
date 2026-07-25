# Web

React medication-reconciliation interface backed by the Hono API.

The entry screen previews planned standalone SMART on FHIR integrations for
Epic, Oracle Health, MEDITECH, and athenahealth. These options are noninteractive.
The **Demo EHR** provider is the only available option and opens the
reconciliation workspace. It uses public synthetic test data through the
existing API and is not an authentication boundary.

## Development

Start both the API and web app from the repository root:

```bash
bun run dev
```

To run only the frontend:

```bash
bun run dev:web
```

Vite serves the app at `http://localhost:5173` and proxies `/api` to the local
API at `http://localhost:3001`.

The demo requires the API and its configured FHIR and AI services. Never enter
real patient information in the demo environment.

Set `VITE_API_BASE_URL` only when the API is hosted separately. The value must
include the `/api` path.

## Verification

```bash
bun --cwd apps/web lint
bun --cwd apps/web build
```

## Cloudflare deployment

The frontend is deployed as the `recmeds` Worker. Its public API URL is defined
in `.env.production` and compiled into the Vite bundle:

```bash
bun run deploy:web
```
