# Web

React medication-reconciliation interface backed by the Hono API.

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

Set `VITE_API_BASE_URL` only when the API is hosted separately. The value must
include the `/api` path.

## Verification

```bash
bun --cwd apps/web lint
bun --cwd apps/web build
```
