# CodeLab

A full LeetCode-style competitive coding platform with real multi-language code execution.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/codelab run dev` — run the frontend (port 21236)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `SESSION_SECRET` — JWT signing secret (already set)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Monaco Editor + wouter
- API: Express 5 + Pino logging
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: JWT via `jsonwebtoken` + `bcryptjs`
- Code execution: Judge0 CE public API (`https://ce.judge0.com`)
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/api-client-react/src/generated/` — Generated React Query hooks + Zod schemas
- `lib/db/src/schema/index.ts` — Drizzle ORM schema (users, problems, submissions, contests)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/judge0.ts` — Judge0 integration
- `artifacts/codelab/src/pages/` — All frontend pages
- `artifacts/codelab/src/components/` — Shared components (layout, auth-provider)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks. Never write fetch calls manually.
- JWT stored in `localStorage` key `codelab_token`, injected via `setAuthTokenGetter` from `@workspace/api-client-react`.
- Judge0 CE public instance used (no API key). Language IDs: JS=63, Python=71, Java=62, C++=54, etc.
- All routes served under `/api` prefix. Frontend served at `/`.
- Contests use `status` field computed from `start_time`/`end_time`: `upcoming`, `active`, or `ended`.

## Product

- **Problems**: Browse 8 seeded algorithmic problems (easy/medium/hard) with search and difficulty filters
- **Code Editor**: Monaco editor split-pane with 10 language options, Run and Submit buttons
- **Submissions**: Real code execution via Judge0 CE, polling for results, status history
- **Contests**: Create and join timed contests, per-contest leaderboards
- **Global Leaderboard**: Ranked by solved count and score
- **User Profiles**: Per-user stats and submission history
- **Admin Panel**: Manage problems and contests (admin role required)
- **Auth**: JWT-based register/login; `admin@codelab.io` / `password` for admin access

## Seed data

- Users: `admin@codelab.io`, `alice@example.com`, `bob@example.com` — all password: `password`
- 8 sample problems: Two Sum, Valid Parentheses, Merge Two Sorted Lists, Add Two Numbers, Longest Substring, Median of Two Sorted Arrays, Climbing Stairs, Maximum Subarray
- 3 contests seeded (1 upcoming, 1 active-window, 1 ended)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Judge0 CE public API has rate limits; for production use, deploy your own Judge0 CE instance or use a paid key.
- `pnpm --filter @workspace/api-spec run codegen` must be re-run after any OpenAPI spec change.
- The API server is NOT a Next.js app — it's a plain Express 5 server compiled with esbuild.
- Do not use `console.log` in server code; use `req.log` or the `logger` singleton.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
