# Auth API Restructure — Industry-Standard Route Design

**Date:** 2026-07-16
**Status:** Approved (pending spec review)
**Scope:** Restructure all authentication-related API routes under `/api/v1` into an
industry-standard, action-based, one-file-per-endpoint layout.

## Goal

Move from catch-all `[...slug]` route handlers with manual `if (action === ...)`
switches to an explicit, self-documenting route tree that follows the conventions
used by mainstream auth providers (Auth0, Supabase, Clerk). Improve clarity, type
safety, and discoverability without changing behavior.

## Constraints & Decisions

- **Convention:** Pragmatic action-based endpoints (verbs like `/auth/login`), not
  strict REST resources.
- **File layout:** One `route.ts` per endpoint. Eliminate `[...slug]` catch-alls.
  A single dynamic segment (e.g. `oauth/[provider]`, `sessions/[id]`) is allowed —
  that is a normal dynamic route, not a catch-all.
- **Grouping:** All auth concerns (oauth, password, email, phone) nest under `/auth`.
  User-owned resources (profile, sessions, upgrade) nest under `/users/me`.
- **Response envelope:** Keep the existing `{ success, payload, timestamp }` shape and
  all status codes / error codes exactly as-is.
- **Cutover:** Clean cutover. Only this Next.js web frontend consumes the API, so no
  backward-compatibility aliases or redirects for old paths.
- **Behavior:** No logic changes. Handlers are moved verbatim; only the routing shell
  (param parsing) and self-referenced URLs change.

## Target Route Structure

### Authentication — `/api/v1/auth/*`

| Method | New path | Moved from |
|--------|----------|------------|
| POST | `/auth/register` | `/auth` (register) |
| POST | `/auth/login` | `/auth` (login) |
| POST | `/auth/logout` | `/auth` (logout) |
| POST | `/auth/logout-all` | `/auth` (logout-all) |
| POST | `/auth/refresh` | `/auth` (refresh) |
| POST | `/auth/guest` | `/oauth` (guest) |
| POST | `/auth/oauth/[provider]` | `/oauth` (google, facebook) |
| POST | `/auth/password/change` | `/auth` (change-password) |
| POST | `/auth/password/forgot` | `/passwords` (forgot) |
| POST | `/auth/password/reset` | `/passwords` (reset) |
| POST | `/auth/email/verify` | `/verification` (email/verify) |
| GET  | `/auth/email/verify?token=` | `/verification` (GET email/verify/:token) |
| POST | `/auth/email/resend` | `/verification` (email/resend) |
| POST | `/auth/phone/verify` | `/verification` (phone) |

### User & sessions — `/api/v1/users/me/*`

| Method | New path | Moved from |
|--------|----------|------------|
| GET | `/users/me` | unchanged (drop duplicate `GET /auth/me`) |
| PATCH | `/users/me` | unchanged |
| DELETE | `/users/me` | unchanged |
| POST | `/users/me/upgrade` | `/auth` (upgrade) |
| GET | `/users/me/sessions` | `/sessions` (list) |
| GET | `/users/me/sessions/current` | `/sessions/current` |
| DELETE | `/users/me/sessions/[id]` | `/sessions/:id` |
| DELETE | `/users/me/sessions` | `/sessions` (revoke all) |

### Folders removed

`src/app/api/v1/oauth`, `src/app/api/v1/passwords`, `src/app/api/v1/verification`,
`src/app/api/v1/sessions`, and the `[...slug]` handler under `src/app/api/v1/auth`.

## Resulting File Tree (auth-related)

```
src/app/api/v1/
  auth/
    register/route.ts
    login/route.ts
    logout/route.ts
    logout-all/route.ts
    refresh/route.ts
    guest/route.ts
    oauth/[provider]/route.ts
    password/
      change/route.ts
      forgot/route.ts
      reset/route.ts
    email/
      verify/route.ts        (POST body token + GET ?token= redirect)
      resend/route.ts
    phone/
      verify/route.ts
  users/
    me/
      route.ts             (GET/PATCH/DELETE — replaces users/[...slug])
      upgrade/route.ts
      sessions/
        route.ts           (GET list + DELETE all)
        current/route.ts   (GET)
        [id]/route.ts      (DELETE one)
```

Note: `users/me` GET/PATCH/DELETE currently live in `users/[...slug]/route.ts`
matching `me`. To add static `users/me/*` sub-resources (upgrade, sessions), the
existing `users/[...slug]/route.ts` will be converted to an explicit
`users/me/route.ts`. This avoids a catch-all vs. static-segment routing conflict.

## Handler Extraction

Each new `route.ts` contains the exact logic block from the corresponding
`if (action === ...)` branch of the old catch-all, with these mechanical changes:
- Remove `params`/`slug` parsing; the path is now fixed.
- `oauth/[provider]` reads `provider` from `params` (a single dynamic segment).
- `sessions/[id]` reads `id` from `params`.
- Preserve all imports, DB calls, validation, cookie handling, and responses.

## Server-side URL references to update

Both self-referenced email links must point to the new verify path:
- `auth/register` handler: `${FRONTEND_URL}/api/v1/auth/email/verify?token=${token}`
- `email/resend` handler: same new URL.

The `GET /auth/email/verify` handler reads the token from the query string
(`request.nextUrl.searchParams.get("token")`) instead of a path segment, and keeps
the redirect-to-`/login?verified=...` behavior.

## Frontend calls to update

| File | Old | New |
|------|-----|-----|
| `src/lib/auth/frontend-auth.ts` | `/api/v1/auth/change-password` | `/api/v1/auth/password/change` |
| `src/lib/auth/frontend-auth.ts` | `/api/v1/passwords/reset` | `/api/v1/auth/password/reset` |
| `src/lib/auth/frontend-auth.ts` | `/api/v1/passwords/forgot` | `/api/v1/auth/password/forgot` |
| `src/lib/auth/frontend-auth.ts` | `/api/v1/sessions` | `/api/v1/users/me/sessions` |
| `src/lib/auth/frontend-auth.ts` | `/api/v1/sessions/${id}` | `/api/v1/users/me/sessions/${id}` |
| `src/app/login/page.tsx` | `/api/v1/oauth/google`, `/api/v1/oauth/facebook` | `/api/v1/auth/oauth/google`, `/api/v1/auth/oauth/facebook` |
| `src/app/signup/page.tsx` | `/api/v1/oauth/google`, `/api/v1/oauth/facebook` | `/api/v1/auth/oauth/google`, `/api/v1/auth/oauth/facebook` |

Unchanged frontend calls (paths already match the new structure): `/api/v1/auth/login`,
`/api/v1/auth/logout`, `/api/v1/auth/register`, `/api/v1/auth/refresh`,
`/api/v1/users/me`.

`reset-password/[token]/page.tsx` and `forgot-password/page.tsx` call through
`frontend-auth.ts` helpers, so updating that file covers them.

## Testing / Verification

1. `npx tsc --noEmit` passes.
2. `npm run build` (production build) succeeds.
3. Live smoke test (dev server): each new path returns expected status:
   - `POST /api/v1/auth/login` (bad creds) → 401 with `invalid_credentials`.
   - `GET /api/v1/users/me/sessions` (no auth) → 401.
   - `GET /api/v1/auth/email/verify?token=bad` → redirect to `/login?verified=false`.
   - Old paths (`/api/v1/oauth/google`, `/api/v1/passwords/forgot`, `/api/v1/sessions`)
     → 404.
4. Manual desktop flow: register → email verify link → login → view sessions →
   change password → logout.

## Out of Scope

- No changes to non-auth routes (games, billing, subscriptions, contact, uploads,
  preferences, system, webhooks, health).
- No changes to validators, models, services, or the response envelope.
- No backward-compatibility aliases.
