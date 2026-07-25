# Repository Guide

## Workspace

- Use Bun from the repository root; `bun.lock` and root `workspaces` are the dependency source of truth.
- `apps/web` is the React 19 + Vite frontend. Its browser entrypoint is `apps/web/src/main.tsx`; the current UI is in `apps/web/src/App.tsx`.
- `apps/api` is one Hono app with a local Node entrypoint in `src/local.ts` and a Cloudflare Worker entrypoint in `src/worker.ts`. Add routes and middleware in `src/app.ts`, not in an entrypoint.
- `packages/schemas` provides shared Zod API contracts as `@app/schemas`.

## Commands

- Install all workspace dependencies: `bun install`
- Run both development servers: `bun run dev`
- Run web dev server on Vite's default `http://localhost:5173`: `bun run dev:web`
- Run API watch server on `http://localhost:3001`: `bun run dev:api`
- Verify web changes: `bun --cwd apps/web lint && bun --cwd apps/web build`
- Verify API changes: `bun --cwd apps/api lint && bun --cwd apps/api typecheck && bun --cwd apps/api build`
- There is no test runner or test suite configured. Use the package-specific checks above rather than guessing a test command.

## Integration Gotchas

- All API routes are under `/api`; patient search, context, and reconciliation routes are under `/api/patients`.
- API CORS defaults to `http://localhost:5173` and can be configured with `WEB_ALLOWED_ORIGINS`.
- Vite proxies `/api` to `http://localhost:3001` during development.
- The API defaults to the public HAPI FHIR R4 test server. Never send real PHI to that server.
- Do not run root `bun run deploy`: it targets a missing `infra/` directory. Deployment infrastructure is not present in this checkout.
- The root `build` script builds both apps; shared schemas have a separate typecheck command.
