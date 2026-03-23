# Story 6.1 — Next.js App Scaffold and Env Validation

**Story ID:** 6.1
**Story Key:** `6-1-nextjs-app-scaffold-and-env-validation`
**Epic:** 6 — SaaS Foundation — Auth, DB Schema, and Infrastructure
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a developer building the Glory Chain SaaS platform, I want `apps/web` scaffolded from its current empty stub into a working Next.js 16 App Router application with validated environment variables, so that all subsequent SaaS stories have a stable, type-safe foundation to build on.

---

## Background and Context

`apps/web` currently has only a `package.json` stub and a `tsconfig.json`. The `build` script uses `|| true` to silently pass CI. This story replaces the stub with a real scaffold:

1. `src/` directory with App Router pages
2. `src/env.ts` — single source of truth for all env vars, validated with `@t3-oss/env-nextjs`
3. `next.config.ts` — imports `./src/env.js` to trigger validation at build time
4. Real `package.json` scripts and deps
5. Next.js–compatible `tsconfig.json`

`SKIP_ENV_VALIDATION=true` allows CI builds without real secrets (standard T3 pattern).

---

## Acceptance Criteria

### AC-1: Directory structure exists
All source files created under `apps/web/src/`.

### AC-2: env.ts validates all required variables
Server: `DATABASE_URL`, `AUTH_SECRET` (min 32), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ENCRYPTION_KEY` (min 32), `APP_URL`. Client: `NEXT_PUBLIC_APP_URL`.

### AC-3: SKIP_ENV_VALIDATION escape hatch
`SKIP_ENV_VALIDATION=true` bypasses validation — module loads without real env vars.

### AC-4: next.config.ts triggers build-time validation
Top-level `import "./src/env.js"` in `next.config.ts`.

### AC-5: tsconfig.json is Next.js–compatible
Adds `jsx`, `dom` lib, path alias `@/*`, Next.js plugin.

### AC-6: package.json has real scripts and all deps
No `|| true` hacks. Includes `react@^19`, `@t3-oss/env-nextjs`, `zod@^3`.

### AC-7: Typecheck passes with SKIP_ENV_VALIDATION=true
`SKIP_ENV_VALIDATION=true pnpm turbo typecheck --filter=@glory-chain/web` exits 0.

---

## File List

- `apps/web/package.json` (updated)
- `apps/web/tsconfig.json` (updated)
- `apps/web/next.config.ts` (new)
- `apps/web/src/env.ts` (new)
- `apps/web/src/app/layout.tsx` (new)
- `apps/web/src/app/page.tsx` (new)
- `apps/web/src/app/not-found.tsx` (new)
- `apps/web/src/app/error.tsx` (new)
- `apps/web/.env.example` (new)
- `turbo.json` (updated — add `.next/**` to build outputs)

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6
