### 14. Scalability Audit

#### 14.1 User Scale Projections

| User Count | Ready? | Bottleneck | Effort to Fix |
|-----------|--------|------------|---------------|
| 10 | Yes | None | N/A |
| 100 | Yes | Minor concerns | Minimal |
| 1,000 | Warning | In-memory state limits, connection pool | Moderate |
| 10,000 | Not ready | Memory + DB + rate limiting breaks | Significant |
| 100,000+ | Not ready | Requires full infrastructure overhaul | Major |
| 1M | Not ready | Would require complete redesign of state management | Very Major |

#### 14.2 Immediate Bottlenecks (100+ users)
1. In-memory rate limiting breaks on multi-instance deployments
2. In-memory brute force store breaks on multi-instance deployments
3. In-memory completionBus loses events on server restart, no multi-instance support
4. No database read replicas — all queries hit the single primary
5. O(n) streak calculation queries ALL completed sessions per user on every completion
6. Connection pool limit of 10 — insufficient for moderate concurrency
7. No CDN for puzzle data beyond Vercel edge network
8. No caching layer — every request hits MongoDB directly

#### 14.3 Scale Barriers (10,000+ users)
1. MongoDB single instance — no replica set, no sharding, no read replicas documented
2. No Redis/caching layer — every puzzle request, session query, and leaderboard query hits the database
3. No CDN for static/puzzle data beyond Vercel's edge network
4. No horizontal scaling for API routes (Vercel auto-scales serverless functions, but MongoDB becomes the bottleneck)
5. Leaderboard pagination uses skip/limit which degrades severely at scale (skip 10000 scans 10000 rows)
6. Streak calculation runs full table scan per completion — O(n) per user per play

#### 14.4 Serverless Readiness (Vercel)
- Route handlers are stateless (aside from in-memory state) — good for serverless
- Database connections use global caching (mongoose connection caching) — reduces cold start impact
- Rate limiting is NOT serverless-ready (in-memory, per-instance, lost on scale-down)
- Brute force protection is NOT serverless-ready (same issue)
- Completion events are NOT serverless-ready (in-memory EventEmitter)
- Session fingerprinting works per-instance but not across instances

---

## 15. Bug Catalogue

| ID | Severity | Category | Title | Evidence | Affected Files | Estimated Effort | Priority |
|----|----------|----------|-------|----------|----------------|-----------------|----------|
| BUG-001 | CRITICAL | API | Duplicate API Surface — legacy and modern endpoints coexist | Legacy routes exist at /sudoku/complete, /crossmath/complete, /tangram/complete alongside modern /games/[game]/sessions/[id]/* patterns | Multiple route files | 16h | High |
| BUG-002 | HIGH | Security | Weak password policy (6-char min, no complexity) | registerSchema min(6) in authValidator.ts | src/lib/server/validators/authValidator.ts | 8h | High |
| BUG-003 | HIGH | Security | No brute force protection on verification/password reset | bruteForce.ts only called in login flow, not in password reset or verification endpoints | src/app/api/v1/auth/[...slug]/route.ts | 8h | High |
| BUG-004 | HIGH | DevOps | No CI/CD pipeline | No .github/workflows/ directory exists | None (missing) | 12h | Critical |
| BUG-005 | HIGH | DevOps | No Dockerfile for containerized deployment | No Dockerfile or docker-compose found | None (missing) | 8h | Medium |
| BUG-006 | HIGH | Testing | No API test suite | Zero test files in src/app/api/ | None (missing) | 24h | Critical |
| BUG-007 | HIGH | Testing | No E2E test suite | No Playwright test files found | None (missing) | 32h | Critical |
| BUG-008 | HIGH | Performance | No Redis/caching layer | All DB queries direct, rate limiting in-memory | Multiple service files | 40h | High |
| BUG-009 | MEDIUM | Performance | Leaderboard uses skip/limit pagination | leaderboardQuerySchema uses numeric cursor (offset) | src/app/api/v1/games/[game]/leaderboard/route.ts | 12h | Medium |
| BUG-010 | MEDIUM | Security | CSP unsafe-eval/unsafe-inline weakens XSS protection | next.config.js CSP script-src includes 'unsafe-eval' and 'unsafe-inline' | next.config.js | 12h | Medium |
| BUG-011 | MEDIUM | Architecture | Auth route handler is god-class (~550 lines, 11 actions) | Single file handles register/login/logout/refresh/change-password/etc. | src/app/api/v1/auth/[...slug]/route.ts | 16h | Medium |
| BUG-012 | MEDIUM | Database | Duplicate PlaySession models | 4 game-specific+1 generic model; top-level model appears unused | src/lib/server/models/PlaySession.ts | 24h | Medium |
| BUG-013 | MEDIUM | Architecture | Dual puzzle data paths | src/data/ and shared/src/data/ contain overlapping puzzle data | src/data/*, shared/src/data/* | 8h | Medium |
| BUG-014 | MEDIUM | Security | CSRF protection incomplete (cookie never set by server) | CSRF middleware checks header/cookie but never sets the cookie | src/lib/server/middleware/csrf.ts | 8h | Medium |
| BUG-015 | LOW | Code Quality | Inconsistent [id] vs [sessionId] naming | Nonogram uses [id], crossmath/tangram use [sessionId], sudoku uses [id] | Multiple session route directories | 4h | Low |
| BUG-016 | LOW | Code Quality | Unused top-level PlaySession model | Creates indexes and TTL but never referenced by any service | src/lib/server/models/PlaySession.ts | 4h | Low |
| BUG-017 | MEDIUM | Performance | O(n) streak calculation queries full session history | StatisticsService.updateUserStats queries ALL completed sessions per user on every completion | src/lib/server/puzzles/*/services/StatisticsService.ts | 8h | Medium |
| BUG-018 | LOW | TypeScript | Excessive any usage in auth helpers | formatUser, authPayload, issueSession, handleOAuth all use user: any | src/lib/server/utils/authHelpers.ts, formatUser.ts | 8h | Low |
| BUG-019 | MEDIUM | DevSecOps | No dependency vulnerability scanning | No Dependabot, Snyk, or npm audit in CI | None (missing) | 4h | High |
| BUG-020 | MEDIUM | Architecture | No API versioning strategy | /v1/ prefix but no deprecation, sunset dates, or version negotiation | N/A | 16h | Medium |

---

## 16. Risk Matrix

| Risk | Likelihood | Impact | Risk Score | Priority | Mitigation | Residual Risk |
|------|-----------|--------|-----------|----------|-----------|---------------|
| No CI/CD pipeline | High | Critical | 25 | P0 | Create GitHub Actions workflow | Low once implemented |
| No automated test coverage | High | High | 20 | P0 | Add Vitest + Playwright tests | Medium |
| Weak password policy | High | High | 20 | P0 | Enforce 8+ chars with complexity | Medium |
| No dependency vulnerability scanning | High | Critical | 20 | P0 | Dependabot + npm audit in CI | Medium |
| No backup strategy | Medium | Critical | 15 | P0 | MongoDB Atlas backups + verification | Medium |
| In-memory state breaks on scale | Medium | High | 15 | P1 | Implement Redis for all mutable state | Medium |
| Incomplete CSRF protection | Medium | High | 15 | P1 | Set CSRF cookie server-side | Low after fix |
| Missing brute force on auth endpoints | Medium | High | 15 | P1 | Add rate limiting to verification/reset | Low after fix |
| No monitoring/observability | High | High | 15 | P0 | Add Sentry + structured logging | Medium |
| CSP weakens XSS protection | Medium | Medium | 12 | P1 | Implement nonce-based CSP | Low after fix |
| Duplicate API surface | Medium | Medium | 12 | P1 | Consolidate legacy endpoints | Low after removal |
| Auth god-class hard to test/maintain | Medium | Medium | 10 | P2 | Decompose auth route | Low after refactoring |
| No Docker/containerization | Medium | Medium | 10 | P2 | Create Dockerfile | Low after creation |
| No API versioning governance | Medium | Medium | 10 | P2 | Establish versioning policy | Low after governance |
| CSRF fallback allows spoofed headers | Medium | Medium | 10 | P1 | Remove header spoof fallback | Low after fix |
| O(n) streak calculation | Low | Medium | 8 | P3 | Cache streaks incrementally | Low after fix |
| Duplicate puzzle data paths | Medium | Low | 8 | P3 | Remove src/data/ duplicates | Low after cleanup |
| No database migration framework | Medium | Medium | 8 | P2 | Add migration tooling | Low after setup |
| Avatar upload without validation | Medium | Medium | 10 | P2 | Add file type/size validation | Low after fix |
| JWT secret entropy unchecked | Low | Critical | 12 | P1 | Enforce 32+ char secrets with entropy check | Low after enforcement |
