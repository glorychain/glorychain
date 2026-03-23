# Story 6.2 — Auth.js v5 OAuth Integration

**Story ID:** 6.2
**Story Key:** `6-2-authjs-v5-oauth-integration`
**Epic:** 6 — SaaS Foundation — Auth, DB Schema, and Infrastructure
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a developer building the Glory Chain SaaS platform, I want Auth.js v5 (next-auth@beta) wired into the Next.js 16 App Router with GitHub and Google OAuth, so that users can authenticate and the app has a type-safe session layer future stories can build on — without requiring a database adapter yet.

---

## Background and Context

Story 6-1 delivered `src/env.ts` with all OAuth env vars validated. This story adds `next-auth@beta`, wires the catch-all API route, adds Next.js middleware for route protection, and creates a minimal sign-in page. JWT sessions only (no adapter) — Drizzle in 6-3 will add a database adapter.

Auth.js v5 `NextAuth()` returns `{ handlers, signIn, signOut, auth }`:
- `handlers` — `{ GET, POST }` mounted at `/api/auth/[...nextauth]`
- `signIn` / `signOut` — server-side helpers for Server Actions
- `auth` — session getter (`await auth()`) and middleware export

---

## Acceptance Criteria

### AC-1: `next-auth@beta` in package.json
### AC-2: `src/server/auth.ts` exports `{ handlers, signIn, signOut, auth }`
JWT strategy, GitHub + Google providers from `env.ts`, `pages.signIn: "/sign-in"`.
### AC-3: Catch-all route at `/api/auth/[...nextauth]`
### AC-4: `src/middleware.ts` protects routes, excludes api/static paths
### AC-5: Session type augmented with `id: string` on `session.user`
### AC-6: Sign-in page at `/sign-in` with GitHub + Google form actions
### AC-7: `signOutAction` server action exported
### AC-8: Pipeline passes — typecheck + lint exit 0

---

## File List

- `apps/web/package.json` (updated — add `next-auth: beta`)
- `apps/web/src/server/auth.ts` (new)
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` (new)
- `apps/web/src/middleware.ts` (new)
- `apps/web/src/app/(auth)/sign-in/page.tsx` (new)
- `apps/web/src/app/(auth)/sign-out-action.ts` (new)

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6
