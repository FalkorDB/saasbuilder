# Security & Code Quality Audit — FalkorDB/saasbuilder vs upstream omnistrate-oss/customer-portal

**Audit date:** 2026-05-02  
**Fork reviewed:** FalkorDB/saasbuilder (`main` branch)  
**Upstream reviewed:** omnistrate-oss/customer-portal (`main` branch)  

> This document cross-references the findings from the comprehensive senior-level code review
> performed on 2026-05-01 against the upstream repository. Each finding is labelled:
> - ✅ **Fixed upstream** — the issue does not exist in `omnistrate-oss/customer-portal`
> - ⚠️ **Partially improved upstream** — the upstream has a meaningful improvement but the root issue remains
> - ❌ **Still present upstream** — identical or equivalent code exists in the upstream

---

## Critical Issues

### C1. XSS in `SyntaxHighlightedLog.tsx` — log content injected as raw HTML
**File:** `src/components/ResourceInstance/Logs/SyntaxHighlightedLog.tsx`  
**Status: ❌ Still present upstream**

`applyBasicHighlighting()` processes raw backend log strings with regex-based replacements that produce
HTML markup, which is then passed directly to `dangerouslySetInnerHTML` with no sanitization call.
The upstream source is **byte-for-byte identical** to the fork — no `DOMPurify.sanitize()` call has
been added.

```ts
// Both repos — line ~384
const highlightedText = applyBasicHighlighting(logLine, detectedFormat);
return <HighlightedLogContent logType={detectedFormat} dangerouslySetInnerHTML={{ __html: highlightedText }} />;
```

**Fix:** Wrap with `DOMPurify.sanitize(highlightedText)` before setting innerHTML.

---

### C2. `app/error.tsx` — App Router error boundary missing required props
**File:** `app/error.tsx`  
**Status: ❌ Still present upstream**

Both the fork and the upstream export `const ErrorPage = () => { ... }` with no parameters.
The App Router requires `{ error: Error & { digest?: string }; reset: () => void }` props.
Without them, Next.js cannot pass the error context and the "try again" recovery pattern
is impossible.

```ts
// Both repos — identical
const ErrorPage = () => {
  const pathname = usePathname();
  const { orgSupportEmail, email } = useProviderOrgDetails();
  ...
```

---

### C3. Double-response in `pages/api/signup.js` (process crash risk)
**File:** `pages/api/signup.js`  
**Status: ❌ Still present upstream**

Both repos have the same fall-through bug. When the backend returns `"tenant already exists"`,
`nextResponse.status(200).send()` is called, and then execution **falls through** to
`nextResponse.status(...).send(...)` a second time, sending two HTTP responses to the same
request and crashing Node.js with "Cannot set headers after they are sent."

```js
// Both repos — identical
if (responseErrorMessage?.toLowerCase() === "tenant already exists" || ...) {
  nextResponse.status(200).send();  // ← sends response...
}
nextResponse.status(error.response?.status || 500).send({ ... }); // ← ...then sends again!
```

**Fix:** Add `return` before `nextResponse.status(200).send()`.

---

### C4. Expensive HTTP call in middleware on every authenticated request
**File:** `proxy.js`  
**Status: ⚠️ Partially improved upstream**

The upstream proxy is significantly improved:
- It now calls the backend's `/user` endpoint **only when the access token is present and not
  expired** (the token is decoded with `jwt-decode` first).
- It adds a 5-second `AbortSignal.timeout(5000)` to prevent hangs.
- If the token is expired but a refresh token cookie exists, it **passes through without hitting
  the backend** (line ~77 in upstream `proxy.js`), letting the client-side 401 interceptor handle
  the refresh.
- Network errors now cause a pass-through (not a redirect-to-sign-in), relying on the client
  interceptor as a fallback.

However, the upstream still makes a live `/user` call for every request with a non-expired JWT,
which remains a latency hit on every page load. The root architectural concern
(DB/upstream call in hot-path) is partially addressed but not eliminated.

---

### C5. `dangerouslySetInnerHTML` without sanitization in dialog components
**File:** `src/components/TextConfirmationDialog/TextConfirmationDialog.jsx` and
`src/components/DeleteAccountConfigConfirmationDialog/DeleteAccountConfigConfirmationDialog.jsx`  
**Status: ❌ Still present upstream**

Both dialog components in the upstream render an unsanitized `message` prop via
`dangerouslySetInnerHTML`:

```jsx
// Both repos — TextConfirmationDialog.jsx
<Text ... dangerouslySetInnerHTML={{ __html: message }} />

// Both repos — DeleteAccountConfigConfirmationDialog.jsx
<Text ... dangerouslySetInnerHTML={{ __html: message }} />
```

`DOMPurify` is already a declared dependency; the fix is a one-line wrap.

---

## High Issues

### H1. `force-dynamic` on root layout disables all caching
**File:** `app/layout.tsx`  
**Status: ❌ Still present upstream**

```ts
// Both repos — identical
export const dynamic = "force-dynamic";
```

---

### H2. Google Fonts loaded via raw `<link>` instead of `next/font`
**File:** `app/layout.tsx`  
**Status: ❌ Still present upstream**

Both repos load Inter via raw `<link>` tags to Google Fonts, causing CLS and an extra
render-blocking network request. The `import Script from "next/script"` line is commented out
in both (`// import Script from "next/script"`), indicating the intent was noted but not acted on.

---

### H3. GA tag ID injected into `dangerouslySetInnerHTML` without escaping (potential XSS)
**File:** `app/layout.tsx`  
**Status: ❌ Still present upstream**

Both repos embed `process.env.GOOGLE_ANALYTICS_TAG_ID` directly inside the `__html` template
string without escaping or validation.

---

### H4. `@typescript-eslint/no-explicit-any` disabled in ESLint config
**File:** `.eslintrc.json`  
**Status: ❌ Still present upstream**

```json
// Both repos — identical
"@typescript-eslint/no-explicit-any": "off",
```

---

### H5. `strict: false` in TypeScript configuration
**File:** `tsconfig.json`  
**Status: ❌ Still present upstream**

Both repos have `"strict": false` with only `strictNullChecks` re-enabled.

---

### H6. SMTP `secure: false` hardcoded
**File:** `src/server/mail-service/mail-config.js`  
**Status: ❌ Still present upstream**

Both repos hardcode `secure: false` regardless of the port configured.

---

### H7. No unit or integration tests (Playwright E2E only)
**File:** `package.json`, `tests/`  
**Status: ⚠️ Partially improved upstream**

The upstream has added HAR recording/replay infrastructure (`test:record`, `test:replay` scripts
in `package.json`; `isRecordMode()`/`isReplayMode()` helpers in `playwright.config.ts`). This
allows E2E tests to be run deterministically against recorded network responses, dramatically
reducing test execution time in replay mode (timeout drops from 12 minutes to 60 seconds per
test). However, there are still **no Jest/Vitest unit tests** for security-critical code paths
(`isAllowedRoute`, `applyBasicHighlighting`, `verifyRecaptchaToken`, auth cookie utilities, etc.).

---

## Medium Issues

### M1. `proxy.js` file name instead of `middleware.ts`
**File:** `proxy.js`  
**Status: ❌ Still present upstream**

Both repos use `proxy.js` instead of `middleware.ts`. The file is not automatically picked up by
Next.js as middleware — it works only because the Express custom server (`server.js`) wires it up
manually.

---

### M2. No `loading.tsx` files anywhere in the app
**Status: ❌ Still present upstream**

A search of the upstream repository returns zero `loading.tsx` files. React Suspense streaming is
not used anywhere in the dashboard.

---

### M3. `QueryClient` instantiated as a module-level singleton in `RootProviders.tsx`
**File:** `app/RootProviders.tsx`  
**Status: ❌ Still present upstream**

```ts
// Both repos — identical
const queryQlient = new QueryClient({ ... });
```

The variable name typo (`queryQlient`) is also unchanged.

---

### M4. `useEnvironmentType()` hook called inside object literal in `useInstances.ts`
**File:** `app/(dashboard)/instances/hooks/useInstances.ts`  
**Status: ❌ Still present upstream**

Both repos call `useEnvironmentType()` inside the params object literal passed to `$api.useQuery()`.

---

### M5. `NEXT_PUBLIC_BACKEND_BASE_DOMAIN` used in server-only API routes
**Files:** `pages/api/refresh-token.js`, `pages/api/logout.js`, `src/api/client.ts`, `src/axios.js`  
**Status: ❌ Still present upstream**

The `NEXT_PUBLIC_` prefix bundles the backend domain into the client-side JS bundle,
defeating the API proxy abstraction. The upstream is identical to the fork on this point.

---

### M6. reCAPTCHA secret key not validated before use
**File:** `src/server/utils/verifyRecaptchaToken.ts`  
**Status: ❌ Still present upstream**

If `GOOGLE_RECAPTCHA_SECRET_KEY` is undefined, the function silently sends
`secret=undefined&response=<token>` to Google, which will always fail and block all
sign-ins/sign-ups in production without a clear error.

---

### M7. Provider JWT token stored in a mutable module-level variable
**File:** `src/server/providerToken.js`  
**Status: ❌ Still present upstream**

Both repos store the provider JWT in a mutable in-process variable with no synchronization.

---

### M8. CSP includes `'unsafe-eval'` and `'unsafe-inline'`
**File:** `next.config.js`  
**Status: ❌ Still present upstream**

Both repos have identical CSP headers that include `'unsafe-eval'` and `'unsafe-inline'`
in `script-src`, undermining XSS protections.

---

### M9. `console.log` (not `console.error`) used for auth errors — may expose PII
**File:** `src/server/api/customer-user.js`  
**Status: ❌ Still present upstream**

All error handlers in the upstream `customer-user.js` use `console.log` instead of
`console.error`, and the full Axios error object (which includes the request config containing
user email/password) is logged:

```js
// Both repos — identical
.catch((error) => {
  console.log("Sign up error", error);  // may include password in request body
```

---

### M10. No `error.tsx` at the dashboard layout segment level
**Status: ❌ Still present upstream**

The upstream has only one `error.tsx` at `app/error.tsx`. There is no segment-level error
boundary at `app/(dashboard)/error.tsx`.

---

### M11. `app/not-found.tsx` — `<title>` rendered as JSX inside a component
**File:** `app/not-found.tsx`  
**Status: ❌ Still present upstream**

Both repos contain `<title>Page not found </title>` inside the `<Heading>` component body
(not via `export const metadata`), which is incorrect in App Router.

---

### M12. Dashboard layout `DashboardLayout` has no TypeScript type for `children`
**File:** `app/(dashboard)/layout.tsx`  
**Status: ❌ Still present upstream**

Both repos have `const DashboardLayout = ({ children }) => { ... }` with no type annotation.

---

## Low Issues

### L1. Empty `turbopack: {}` in `next.config.js`
**Status: ❌ Still present upstream** — identical in both repos.

### L2. Duplicate `dayjs` and `date-fns` dependencies
**Status: ❌ Still present upstream** — both libraries in `package.json` in both repos.

### L3. `prop-types` as a production dependency alongside TypeScript
**Status: ❌ Still present upstream** — `"prop-types": "^15.6.0"` in both repos.

### L4. Duplicate `axios` in both `dependencies` and `resolutions`
**Status: ❌ Still present upstream** — identical in both `package.json`.

### L5. "Omnistrate" in user-facing page metadata
**File:** `app/layout.tsx`  
**Status: ❌ Still present upstream**

```ts
// Both repos — identical
export const metadata: Metadata = {
  title: "Omnistrate",
  description: "Working template for a SaaS service Front-end for Services created using Omnistrate",
};
```

### L6. `Logo.jsx` passes `src=""` to `next/image`
**Status: Not checked** — outside scope of upstream comparison.

### L7. Missing accessible ARIA attributes on modal dialogs
**Status: Not checked** — structural, no upstream-specific change observed.

### L8. No per-route `generateMetadata`
**Status: ❌ Still present upstream** — no `generateMetadata` exports found in any route segment.

---

## Summary Table

| # | Finding | Severity | Upstream Status |
|---|---------|----------|-----------------|
| C1 | XSS in `SyntaxHighlightedLog` (unsanitized `dangerouslySetInnerHTML`) | 🔴 Critical | ❌ Still present |
| C2 | `app/error.tsx` missing required error boundary props | 🔴 Critical | ❌ Still present |
| C3 | Double-response / process crash in `signup.js` | 🔴 Critical | ❌ Still present |
| C4 | Backend HTTP call on every request in middleware | 🔴 Critical | ⚠️ Partially improved |
| C5 | Unsanitized `dangerouslySetInnerHTML` in dialog components | 🔴 Critical | ❌ Still present |
| H1 | `force-dynamic` on root layout | 🟠 High | ❌ Still present |
| H2 | Google Fonts via raw `<link>` (CLS) | 🟠 High | ❌ Still present |
| H3 | GA tag ID unescaped in `dangerouslySetInnerHTML` | 🟠 High | ❌ Still present |
| H4 | `@typescript-eslint/no-explicit-any` disabled | 🟠 High | ❌ Still present |
| H5 | `strict: false` in TypeScript | 🟠 High | ❌ Still present |
| H6 | SMTP `secure: false` hardcoded | 🟠 High | ❌ Still present |
| H7 | No unit tests for security-critical paths | 🟠 High | ⚠️ Partially improved (HAR replay added) |
| M1 | `proxy.js` not `middleware.ts` | 🟡 Medium | ❌ Still present |
| M2 | No `loading.tsx` / no Suspense streaming | 🟡 Medium | ❌ Still present |
| M3 | `QueryClient` module-level singleton + typo | 🟡 Medium | ❌ Still present |
| M4 | Hook called inside object literal (`useInstances`) | 🟡 Medium | ❌ Still present |
| M5 | `NEXT_PUBLIC_` prefix on server-only env var | 🟡 Medium | ❌ Still present |
| M6 | reCAPTCHA secret key not validated | 🟡 Medium | ❌ Still present |
| M7 | Provider JWT in module-level variable | 🟡 Medium | ❌ Still present |
| M8 | CSP with `unsafe-eval` + `unsafe-inline` | 🟡 Medium | ❌ Still present |
| M9 | `console.log` for auth errors (possible PII leak) | 🟡 Medium | ❌ Still present |
| M10 | No segment-level `error.tsx` at dashboard | 🟡 Medium | ❌ Still present |
| M11 | `<title>` rendered as JSX in `not-found.tsx` | 🟡 Medium | ❌ Still present |
| M12 | `DashboardLayout` untyped `children` | 🟢 Low | ❌ Still present |
| L1 | Empty `turbopack: {}` | 🟢 Low | ❌ Still present |
| L2 | Duplicate date libraries | 🟢 Low | ❌ Still present |
| L3 | `prop-types` in prod deps | 🟢 Low | ❌ Still present |
| L4 | `axios` duplicated in resolutions | 🟢 Low | ❌ Still present |
| L5 | "Omnistrate" in page metadata | 🟢 Low | ❌ Still present |
| L8 | No per-route `generateMetadata` | 🟢 Low | ❌ Still present |

---

## Upstream-Only Improvements (present in upstream, not in fork)

These are fixes/enhancements that exist in `omnistrate-oss/customer-portal` but are **not yet
synced back** to `FalkorDB/saasbuilder`:

1. **Middleware token expiry check before backend call** — `proxy.js` upstream uses
   `isTokenMissingOrExpired()` to skip the `/user` call when the JWT is already expired,
   falling back to client-side refresh. Adds `AbortSignal.timeout(5000)` to the `/user` fetch.
   Also adds `clearAllAuthCookies()` helper to clear all three auth cookies atomically on logout.

2. **`logoutInProgress` flag in `src/api/client.ts`** — the upstream adds a
   `let logoutInProgress = false` guard so that parallel 401 responses only trigger one logout
   redirect, preventing redundant logout calls.

3. **HAR recording/replay testing infrastructure** — `test:record` and `test:replay` scripts,
   `isRecordMode()`/`isReplayMode()` helpers, and per-mode Playwright configuration allow
   deterministic E2E test runs without a live backend.

4. **`signin.js` sets the indicator cookie server-side** — the upstream `signin.js` calls
   `setIndicatorCookie(nextResponse)` directly in the success path, so the client doesn't need
   to set it separately after `handlePasswordSignInSuccess()`.

---

## Key Takeaway

The fork (`FalkorDB/saasbuilder`) and the upstream (`omnistrate-oss/customer-portal`) are nearly
identical for all 28 reviewed findings. **Only 2 items show any improvement in the upstream**
(C4 and H7), and both are partial improvements rather than complete fixes. All 5 critical
security issues persist in the upstream. Fixes to these issues should be contributed upstream
and synced back to this fork simultaneously.
