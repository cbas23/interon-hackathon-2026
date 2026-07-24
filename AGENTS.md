# Repository Guide

## Workspace

- Use Bun from the repository root; `bun.lock` and root `workspaces` are the dependency source of truth.
- `apps/web` is the React 19 + Vite frontend. Its browser entrypoint is `apps/web/src/main.tsx`; the current UI is in `apps/web/src/App.tsx`.
- `apps/api` is one Hono app shared by two adapters: `src/local.ts` starts the local Node server, while `src/lambda.ts` exports the AWS Lambda handler. Add routes and middleware in `src/app.ts`, not in an adapter.
- `packages/` currently has no packages. Do not assume shared workspace libraries exist.

## Commands

- Install all workspace dependencies: `bun install`
- Run web dev server on Vite's default `http://localhost:5173`: `bun run dev:web`
- Run API watch server on `http://localhost:3001`: `bun run dev:api`
- Verify web changes: `bun --cwd apps/web lint && bun --cwd apps/web build`
- Verify API changes: `bun --cwd apps/api typecheck`
- There is no test runner or test suite configured. Use the package-specific checks above rather than guessing a test command.

## Integration Gotchas

- All API routes are under `/api`; current local endpoints include `/api/health` and `/api/hello`.
- API CORS currently allows only `http://localhost:5173`. Keep this synchronized if the web development origin changes.
- The web Vite config has no `/api` proxy and the frontend currently does not call the API. Browser requests must use the API origin explicitly unless a proxy is added.
- Ignore the API README's `bun run index.ts` command; no `index.ts` exists. The working command is the root `bun run dev:api` script.
- Do not run root `bun run deploy`: it targets a missing `infra/` directory. Deployment infrastructure is not present in this checkout.
- The root `build` script builds only `apps/web`; API validation is the separate typecheck command above.
