# Code Audit Report — Prospect2000 Dashboard

**Date:** 2026-04-11  
**Scope:** Full-stack audit (Angular 19 frontend + .NET 10 backend + infrastructure)  
**Method:** 4 parallel specialized agents analyzing backend, frontend, infrastructure, and auth/tests independently  
**Context:** Codebase generated via AI orchestrator + sub-agents workflow

---

## Executive Summary

| Area | Grade | Risk Level |
|------|-------|------------|
| Backend Security | C+ | HIGH |
| Backend Code Quality | B | MEDIUM |
| Frontend Security | B- | MEDIUM-HIGH |
| Frontend Code Quality | B+ | MEDIUM |
| Infrastructure & CI/CD | C+ | HIGH |
| Authentication Flow | C+ | HIGH |
| Test Coverage | D+ | HIGH |
| **OVERALL** | **C+** | **MEDIUM-HIGH** |

**Verdict:** The codebase has a solid architectural foundation but is **not production-ready** in its current state. The AI-generated scaffolding correctly established layered architecture, standalone Angular components, JWT+refresh token flows, and DI patterns. However, multiple security vulnerabilities — particularly around token management, data isolation, and infrastructure exposure — must be resolved before any production deployment.

---

## Critical Issues — P0 (Block Production)

These issues represent direct security vulnerabilities or crash-inducing bugs.

### CRIT-01 — PostgreSQL exposed publicly via docker-compose
**Severity:** CRITICAL | **File:** `docker-compose.yml`  
Port `5432` is mapped to `0.0.0.0:5432`, making the database reachable from any network interface on the host. In any cloud environment (VPS, EC2, etc.) this is a direct path to the database without authentication beyond the postgres password.  
**Fix:** Remove the port mapping from the `db` service entirely, or bind to `127.0.0.1:5432`.

### CRIT-02 — Password reset tokens stored in plaintext
**Severity:** CRITICAL | **File:** `api/Api/Services/AuthService.cs`  
Reset tokens are stored directly in the database without hashing. If the database is ever breached, all pending reset tokens are immediately usable for account takeover.  
**Fix:** Store `SHA-256(token)` in the DB; compare `SHA-256(submitted_token)` at validation time.

### CRIT-03 — No token revocation on logout
**Severity:** CRITICAL | **File:** `api/Api/Services/AuthService.cs`, `api/Api/Controllers/AuthController.cs`  
JWT tokens issued at login remain valid until expiry even after logout. There is no token blacklist or version counter. A stolen token is usable for the full `JWT_EXPIRY_MINUTES` window after the user logs out.  
**Fix:** Implement a token version counter on the user entity (increment on logout); validate version in JWT middleware.

### CRIT-04 — `Guid.Parse()` used without error handling
**Severity:** CRITICAL | **Files:** Multiple controllers  
`Guid.Parse(userId)` throws `FormatException` on any malformed input. The global exception handler will catch this, but it produces a 500 rather than a 400 and creates unnecessary noise.  
**Fix:** Replace all `Guid.Parse()` with `Guid.TryParse()` and return `BadRequest()` on failure.

### CRIT-05 — Data isolation gap in Tag/Campaign lookups
**Severity:** CRITICAL | **File:** `api/Api/Services/`  
Tag and Campaign queries may not consistently filter by `userId`. A user could potentially access or modify another user's data by supplying a known resource ID.  
**Fix:** Audit every `FindAsync()` / `FirstOrDefaultAsync()` call — ensure they include `.Where(x => x.UserId == currentUserId)`.

### CRIT-06 — Open redirect via `returnUrl` query parameter
**Severity:** CRITICAL | **File:** `frontend/src/app/features/auth/login/login.component.ts` (~line 55)  
```typescript
const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
this.router.navigateByUrl(returnUrl); // Dangerous — no validation
```
An attacker can craft `https://app.com/login?returnUrl=https://evil.com` and redirect the victim after login.  
**Fix:** Validate that `returnUrl` is a relative path starting with `/` before using it.

### CRIT-07 — Dev credentials committed to repository
**Severity:** CRITICAL | **File:** `api/Api/appsettings.Development.json`  
Database credentials and JWT secrets appear in `appsettings.Development.json`, which is tracked by git. If this repo is ever made public, credentials are permanently exposed in git history.  
**Fix:** Remove secrets from the file, replace with placeholder strings, and use `dotnet user-secrets` for local development. Run `git filter-repo` to purge the history.

### CRIT-08 — Inconsistent token storage (sessionStorage vs localStorage)
**Severity:** CRITICAL | **Files:** `frontend/src/app/core/services/auth.service.ts`, `frontend/src/app/core/interceptors/error.interceptor.ts`  
Auth service stores tokens in `sessionStorage`, but the error interceptor clears keys from `localStorage`. One of these is wrong — tokens are never actually cleared on 401, leaving stale auth state.  
**Fix:** Pick one storage location and use it consistently everywhere, or better: move to HttpOnly cookies (see CRIT-09).

### CRIT-09 — Access tokens in sessionStorage (XSS-stealable)
**Severity:** CRITICAL | **File:** `frontend/src/app/core/services/auth.service.ts` (lines ~143, 151, 158)  
Any XSS vulnerability anywhere in the app allows an attacker to call `sessionStorage.getItem('access_token')` and exfiltrate the token.  
**Fix:** Have the backend set the access token as an `HttpOnly; Secure; SameSite=Strict` cookie. Remove all client-side token storage.

---

## Backend Audit

### Security — Grade: C+

| ID | Severity | Issue | File |
|----|----------|-------|------|
| BE-S01 | CRITICAL | `Guid.Parse()` without try-catch | Multiple controllers |
| BE-S02 | CRITICAL | Data isolation gap (userId filter missing) | Services/ |
| BE-S03 | HIGH | CORS uses `AllowAnyMethod()` + `AllowAnyHeader()` | Program.cs or ServiceCollectionExtensions.cs |
| BE-S04 | HIGH | No HTTPS enforcement (`UseHttpsRedirection` absent) | Program.cs |
| BE-S05 | HIGH | JWT claim extraction without null checks | AuthService.cs |
| BE-S06 | MEDIUM | `AllowedHosts: "*"` in config | appsettings.json |
| BE-S07 | MEDIUM | No security headers (X-Frame-Options, HSTS, CSP) | Program.cs |

**CORS:** `AllowAnyMethod()` and `AllowAnyHeader()` should be replaced with explicit allowlists:
```csharp
policy.WithMethods("GET", "POST", "PUT", "DELETE")
      .WithHeaders("Authorization", "Content-Type");
```

### Code Quality — Grade: B

| ID | Severity | Issue | File |
|----|----------|-------|------|
| BE-Q01 | HIGH | `GetUserId()` duplicated in every controller | Controllers/ |
| BE-Q02 | HIGH | No pagination on list endpoints | ProspectsController, ClientsController, etc. |
| BE-Q03 | MEDIUM | Magic configuration keys not extracted to constants | Services/ |
| BE-Q04 | MEDIUM | Null-checking inconsistent (some `?? throw`, some silent null) | Services/ |
| BE-Q05 | LOW | No base controller class | Controllers/ |
| BE-Q06 | LOW | No API versioning header/strategy beyond URL prefix | Controllers/ |

**Recommendation:** Create `BaseController : ControllerBase` with a shared `GetCurrentUserId()` method to eliminate duplication.

### Robustness — Grade: B

| ID | Severity | Issue | File |
|----|----------|-------|------|
| BE-R01 | HIGH | No input length/format validation on DTOs | Models/DTOs/ |
| BE-R02 | HIGH | Incomplete services (Billing, Email) not feature-flagged | Services/ |
| BE-R03 | MEDIUM | No DB retry policy for transient connection failures | Program.cs |
| BE-R04 | MEDIUM | No `CancellationToken` threading in controller actions | Controllers/ |
| BE-R05 | LOW | Health check reports only DB connectivity, not service health | HealthController.cs |

---

## Frontend Audit

### Security — Grade: B-

| ID | Severity | Issue | File |
|----|----------|-------|------|
| FE-S01 | CRITICAL | Tokens in sessionStorage (XSS-stealable) | core/services/auth.service.ts:143,151,158 |
| FE-S02 | CRITICAL | Open redirect via unvalidated `returnUrl` | features/auth/login/login.component.ts:55 |
| FE-S03 | CRITICAL | Inconsistent token storage (sessionStorage vs localStorage) | auth.service.ts + error.interceptor.ts |
| FE-S04 | HIGH | 401 redirect logic is commented out | core/interceptors/error.interceptor.ts:27-39 |
| FE-S05 | HIGH | Admin role change without confirmation or audit log | features/admin/admin.component.ts:171-177 |
| FE-S06 | MEDIUM | No CSRF protection | Global |
| FE-S07 | MEDIUM | Race condition in auth guard (async user load not awaited) | core/guards/auth.guard.ts:19-33 |
| FE-S08 | LOW | `$any()` type bypass in template | features/expenses/expenses.component.ts:252 |

**Open redirect fix:**
```typescript
const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
const safeUrl = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/dashboard';
this.router.navigateByUrl(safeUrl);
```

### Code Quality — Grade: B+

| ID | Severity | Issue | File |
|----|----------|-------|------|
| FE-Q01 | HIGH | Subscription memory leaks (no `takeUntilDestroyed`) | dashboard, clients, admin components |
| FE-Q02 | MEDIUM | `expenses.component.ts` is 944 lines — too large | features/expenses/ |
| FE-Q03 | MEDIUM | Mixed signals + RxJS patterns in same components | clients, expenses components |
| FE-Q04 | MEDIUM | Hardcoded magic numbers in chart configs | dashboard.component.ts |
| FE-Q05 | LOW | No constants file for shared config values | shared/ |
| FE-Q06 | LOW | No index barrel files in feature directories | features/ |

**Memory leak fix (Angular 16+):**
```typescript
private destroyRef = inject(DestroyRef);

this.service.getData()
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(data => { ... });
```

### Robustness — Grade: B

| ID | Severity | Issue | File |
|----|----------|-------|------|
| FE-R01 | HIGH | Silent error handling — `catchError(() => of(null))` | auth.service.ts:117-120 |
| FE-R02 | HIGH | No HTTP retry logic for transient failures | All services |
| FE-R03 | HIGH | No request timeout configured | All HTTP calls |
| FE-R04 | MEDIUM | No loading states in forgot/reset password | features/auth/ |
| FE-R05 | MEDIUM | Lists load all records — no pagination or virtual scroll | clients, expenses, prospects |
| FE-R06 | LOW | No optimistic updates on CRUD operations | All feature components |

---

## Infrastructure & CI/CD Audit

### Docker Security — Grade: C

| ID | Severity | Issue | File |
|----|----------|-------|------|
| INF-D01 | CRITICAL | PostgreSQL port 5432 mapped to `0.0.0.0` | docker-compose.yml |
| INF-D02 | HIGH | Base image versions not pinned to SHA digest | Dockerfile |
| INF-D03 | HIGH | No non-root user in final Docker image | Dockerfile |
| INF-D04 | MEDIUM | No explicit Docker network isolation | docker-compose.yml |
| INF-D05 | MEDIUM | No container restart policies defined | docker-compose.yml |

**Fix docker-compose.yml database section:**
```yaml
db:
  image: postgres:15-alpine
  # Remove this:
  # ports:
  #   - "5432:5432"
  # Services access DB via internal Docker network only
```

### CI/CD Pipeline — Grade: B-

| ID | Severity | Issue | File |
|----|----------|-------|------|
| INF-CI01 | HIGH | No SAST scanning (CodeQL / SonarQube) | .github/workflows/ci.yml |
| INF-CI02 | HIGH | Trivy scan configured but results not fail-gated | .github/workflows/ci.yml |
| INF-CI03 | HIGH | No secrets detection (TruffleHog / GitLeaks) | .github/workflows/ci.yml |
| INF-CI04 | MEDIUM | No `npm audit` step in frontend job | .github/workflows/ci.yml |
| INF-CI05 | MEDIUM | No `dotnet list package --vulnerable` check | .github/workflows/ci.yml |
| INF-CI06 | LOW | No Docker image signing (cosign / SBOM) | .github/workflows/ci.yml |

### Configuration — Grade: C+

| ID | Severity | Issue | File |
|----|----------|-------|------|
| INF-CF01 | CRITICAL | Dev credentials in tracked config file | api/Api/appsettings.Development.json |
| INF-CF02 | HIGH | `AllowedHosts: "*"` — should be domain-locked in prod | appsettings.json |
| INF-CF03 | MEDIUM | No validation that JWT secret meets minimum length at startup | Program.cs |
| INF-CF04 | LOW | No `.env.prod.example` documenting production-specific vars | Root |

---

## Authentication & Authorization Deep-Dive

### Auth Flow — Grade: C+

**What works correctly:**
- JWT generation with role claims
- Refresh token stored as hash in database
- `withCredentials: true` for cookie-based refresh
- Role-based route guards on frontend

**What is broken or insecure:**

| ID | Severity | Issue |
|----|----------|-------|
| AUTH-01 | CRITICAL | Reset tokens stored in plaintext (see CRIT-02) |
| AUTH-02 | CRITICAL | No logout token revocation (see CRIT-03) |
| AUTH-03 | HIGH | No refresh token rotation — same token reusable indefinitely |
| AUTH-04 | HIGH | No failed login attempt tracking / brute force protection |
| AUTH-05 | HIGH | JWT `iat` claim may use incorrect format (string vs numeric) |
| AUTH-06 | MEDIUM | No token binding / fingerprinting (device/IP) |
| AUTH-07 | MEDIUM | PII (email addresses) logged in auth service |
| AUTH-08 | MEDIUM | Role values are raw strings — no enum for type safety |
| AUTH-09 | LOW | No JWT key rotation strategy (kid header not used) |

**Refresh token rotation fix pattern:**
```csharp
// On each successful refresh:
// 1. Invalidate old refresh token
// 2. Issue new refresh token
// 3. Return both new access token + new refresh token
```

---

## Test Coverage Analysis

### Grade: D+

**Current state:** Integration tests exist for data-layer operations (CRUD isolation), but the authentication surface is completely untested.

| Area | Coverage | Status |
|------|----------|--------|
| Health endpoint | ~80% | OK |
| Data CRUD + isolation | ~60% | Partial |
| Auth login / logout | 0% | MISSING |
| Token refresh flow | 0% | MISSING |
| Password reset flow | 0% | MISSING |
| Role-based access control | 0% | MISSING |
| Invalid input / error cases | ~20% | Insufficient |
| Frontend unit tests | Unknown | Not audited |

**Minimum tests required before production:**

```
AuthEndpointTests.cs:
  - Login_WithValidCredentials_ReturnsJWT
  - Login_WithInvalidPassword_Returns401
  - Login_WithUnknownEmail_Returns401
  - Refresh_WithValidToken_ReturnsNewJWT
  - Refresh_WithExpiredToken_Returns401
  - Refresh_WithRevokedToken_Returns401
  - Logout_InvalidatesRefreshToken
  - ResetPassword_WithValidToken_ChangesPassword
  - ResetPassword_WithExpiredToken_Returns400
  - AdminEndpoint_WithUserRole_Returns403
  - AdminEndpoint_WithAdminRole_Returns200
  - DataIsolation_UserCannotAccessOtherUserData
```

---

## Prioritized Action Plan

### P0 — Block Production (Fix Immediately)

1. **Restrict PostgreSQL network** — remove port mapping from docker-compose.yml (`docker-compose.yml`)
2. **Hash password reset tokens** — store SHA-256 hash, not plaintext (`AuthService.cs`)
3. **Implement token revocation** — add version counter or blacklist table (`AuthService.cs`, new migration)
4. **Fix open redirect** — validate `returnUrl` is a relative path (`login.component.ts:55`)
5. **Purge dev credentials from git** — use `git filter-repo`, switch to `dotnet user-secrets`
6. **Fix token storage** — use HttpOnly cookies OR at minimum fix the sessionStorage/localStorage inconsistency (`auth.service.ts`, `error.interceptor.ts`)
7. **Fix data isolation** — audit all service queries for missing `userId` filters

### P1 — Fix Before Any User Traffic

8. **Add HTTPS enforcement** — `app.UseHttpsRedirection()` + HSTS headers (`Program.cs`)
9. **Tighten CORS** — specify exact allowed methods and headers
10. **Add auth integration tests** — minimum 12 tests covering login, refresh, reset, RBAC
11. **Add brute force protection** — rate limit login endpoint per IP/email
12. **Add refresh token rotation** — invalidate old token on each refresh use
13. **Fix 401 redirect in error interceptor** — uncomment/complete navigation (`error.interceptor.ts`)
14. **Validate admin role change** — add confirmation dialog + server-side audit log

### P2 — Fix This Sprint

15. **Replace `Guid.Parse()`** → `Guid.TryParse()` in all controllers
16. **Add memory leak fixes** — `takeUntilDestroyed()` in all components with subscriptions
17. **Add SAST to CI** — CodeQL or SonarQube GitHub Action
18. **Add secrets detection to CI** — TruffleHog or GitLeaks pre-commit + CI step
19. **Lock `AllowedHosts`** — set production domain in appsettings production config
20. **Add request timeout** — `timeout(30000)` in HTTP service calls

### P3 — Polish (Next Release)

21. Break up large components (`expenses.component.ts` at 944 lines)
22. Extract `GetUserId()` to shared base controller
23. Add pagination to all list endpoints and components
24. Add retry logic for transient HTTP failures
25. Pin Docker base images to SHA digests
26. Add `npm audit` and `dotnet list package --vulnerable` to CI
27. Create `shared/constants.ts` for magic numbers/strings

---

## Positive Highlights

The AI-generated code demonstrates solid patterns in several areas:

- **Angular 19 best practices** — Standalone components, signals for reactive state, functional route guards and interceptors, strict TypeScript config — all correctly implemented
- **Layered backend architecture** — Controllers → Services → Data layer well respected; DI registration centralized in `Extensions/ServiceCollectionExtensions.cs`
- **JWT foundation is sound** — Role claims, refresh token hashing, `withCredentials` for cookie transport all point in the right direction; the gaps are in the details, not the design
- **RFC 7807 error responses** — `GlobalExceptionHandlingMiddleware` returns proper `ProblemDetails` consistently
- **Docker multi-stage build** — Correct separation of build and runtime stages keeps the image small
- **CI/CD pipeline exists** — The GitHub Actions workflow covers build, test, and Trivy scan — a solid starting point that needs hardening, not replacement
- **Consistent async/await usage** — All I/O operations correctly use async patterns throughout the backend

---

*Report generated 2026-04-11 by parallel AI audit agents (backend, frontend, infrastructure, auth+tests).*
