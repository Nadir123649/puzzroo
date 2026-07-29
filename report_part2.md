### 4. Database Audit

#### 4.1 MongoDB Collections

| Collection | Model | Key Indexes | TTL |
|-----------|-------|-------------|-----|
| users | User | username(unique), email(unique sparse), publicId(unique sparse), firebaseUid | No |
| loginSessions | LoginSession | userId, (userId+deviceFingerprint+status), lastSeenAt | 7 days |
| playSessions | PlaySession | userId+puzzleId, userId+status, userId+status+completedAt | 90 days |
| crossmathSessions | CrossMathPlaySession | Various per-game per-user patterns | No explicit |
| nonogramSessions | NonogramPlaySession | Various per-game per-user patterns | No explicit |
| sudokuSessions | SudokuPlaySession | Various per-game per-user patterns | No explicit |
| tangramPlaySessions | TangramPlaySession | Various per-game per-user patterns | No explicit |
| gameProgress | GameProgress | userId+gameId+puzzleId(unique) | No |
| dailyChallenges | DailyChallenge | (date+userId unique), date, userId | No |
| puzzleStatistics | PuzzleStatistics | puzzleId(unique), difficulty | No |
| userStatistics | UserStatistics | userId+gameId(unique) | No |
| analyticsEvents | AnalyticsEvent | userId+timestamp, event+timestamp, timestamp | 180 days |
| contactMessages | ContactMessage | userId, status | No |
| subscriptions | Subscription | userId(unique), stripeCustomerId(sparse) | No |
| transactions | Transaction | userId, stripePaymentIntentId(sparse) | No |
| emailPreferences | EmailPreference | userId(unique) | No |

#### 4.2 Database Observations

**Strengths:**
- TTL indexes on LoginSession (7 days) and AnalyticsEvent (180 days) for automatic data cleanup
- Compound indexes on frequently queried patterns (userId+gameId, userId+puzzleId)
- Unique indexes on publicId, email, username to prevent duplicates
- Sparse indexes on email for guest accounts without emails
- Index on lastLoginAt for user activity queries

**Weaknesses:**
- No backup strategy documented — no mention of MongoDB backups, snapshots, or replica sets
- No migration framework — schema changes are ad-hoc with post-hooks on User model
- Connection pool limit of 10 — insufficient for moderate concurrency under load
- No read replicas — all queries hit the same primary
- No sharding strategy for horizontal scaling
- Analytics events can grow unbounded between TTL sweeps (up to 180 days)
- No denormalization strategy — user statistics are computed on-the-fly via aggregation rather than cached
- Puzzle solutions stored directly in puzzle documents — if a puzzle is found to be flawed, there is no easy way to update solutions after deployment

#### 4.3 Query Efficiency Risks

- Streak calculation queries ALL completed sessions per user on every completion — O(n) per completion, runs sequentially
- Daily puzzle selection uses $sample aggregation which is efficient for random selection
- Leaderboard pagination uses skip/limit which degrades at scale (skip 10000 scans 10000 rows)
- StatisticsService.recomputeOnEveryCompletion queries the entire completed sessions collection per user

### 5. Security Audit

#### 5.1 OWASP Top 10 Assessment

| Category | Status | Severity | Notes |
|----------|--------|----------|-------|
| A01 Broken Access Control | MEDIUM | Medium | Guest role can access some game APIs; no explicit resource-level ownership checks on all session routes |
| A02 Cryptographic Failures | LOW | Low | bcrypt cost 10 adequate for passwords; JWT uses HS256 with configurable secrets |
| A03 Injection | LOW | Low | Mongoose ODM parameterized queries; Zod validates all inputs; no direct MongoDB expression injection |
| A04 Insecure Design | MEDIUM | Medium | No idempotency keys; CSRF protection falls back to spoofable custom headers; no explicit threat modeling |
| A05 Security Misconfiguration | HIGH | High | No Dockerfile; no CI/CD security scanning; no dependency vulnerability scanning; no CSP nonce; no security headers in dev |
| A06 Vulnerable Components | MEDIUM | Medium | Dependencies not scanned in this audit; eslint v8 is EOL; requires ongoing scanning |
| A07 Auth Failures | LOW | Low | Strong auth design with rotation, brute force protection, session revocation |
| A08 Software Integrity | MEDIUM | Medium | No supply chain scanning; no SLSA provenance |
| A09 Logging Failures | MEDIUM | Medium | Audit logging exists but is fire-and-forget with silent failure swallowing; no centralized logging |
| A10 SSRF | LOW | Low | No SSRF vectors observed in server-side code |

#### 5.2 JWT Security

- Access tokens: HS256, 15-minute expiry (configurable via ACCESS_TOKEN_EXPIRES)
- Refresh tokens: HS256, 7-day expiry (configurable via REFRESH_TOKEN_EXPIRES)
- Algorithm explicitly restricted to HS256 (no algorithm confusion possible)
- JWT_SECRET checked for minimum 16 chars but not for entropy/quality
- JWT_SECRET checked for minimum length (16 chars) with a warning if below 32 chars — but execution continues anyway even if weak
- Refresh tokens contain jti (session ID) and ver (token version) for rotation detection
- Reuse detection: if a tokenVersion mismatch occurs, the session is revoked and all tokens for that user become invalid
- Access tokens are NOT httpOnly — they are stored in memory (React state), which is good for XSS resistance but means a refresh is needed on every page load
- Refresh tokens ARE in httpOnly, Secure, SameSite=Strict cookies — good for CSRF resistance
- No revocation list maintained server-side for invalidated tokens (relies on LoginSession status check)

#### 5.3 Authentication & Session Security (Detailed)

**Strengths:**
- Refresh tokens stored in httpOnly, Secure, SameSite=Strict cookies
- Session-based JTI means logout is server-side effective
- Brute force protection with progressive lockout (5 attempts / 5s lock, 10 / 30s lock, 20 / 5min lock)
- Rate limiting on all auth endpoints (3-30 req/min depending on sensitivity)
- OAuth account linking prevents duplicate accounts from different providers
- Guest-to-premium conversion preserves all history (same _id)
- Password change invalidates tokens via token version bump
- "Logout All" revokes all active sessions across all devices
- Email verification flow with 24-hour expiring tokens
- Device fingerprinting (SHA-256 hash of User-Agent header) on sessions
- Geo-location tracking on sessions (geoLocate from IP)
- Auth events logged (login, login_failed, logout, logout_all, etc.)

**Weaknesses:**
- No brute force protection on verification or password reset endpoints (only login and registration protected)
- No account lockout after repeated failed verification attempts
- Email verification tokens are SHA-256 hashed (not bcrypt) — acceptable for short-lived tokens but different from password hashing
- Reset password token expiry not explicitly configured in the auth route handler
- CSRF protection falls back to allowing requests with x-requested-with or x-forwarded-for headers, which can be spoofed by malicious extensions or sites
- No explicit CSRF token cookie set by server-side middleware — the CSRF middleware checks for a mismatch but never sets the cookie itself

#### 5.4 Input Validation (Zod Schemas)

Password policy (registerSchema): min 6 chars, max 20 chars — below NIST/OWASP recommendations (minimum 8+ with complexity requirements for uppercase, lowercase, digits, special characters). No password breach check integrated.

Username validation: 3-20 chars, lowercase alphanumeric + ._- — reasonable.

Email validation: Uses Zod's built-in .email() validator — adequate.

#### 5.5 Content Security Policy (Production)

Production CSP from next.config.js includes 15 directives:
- default-src 'self'
- connect-src 'self' + cloudinary + firebase + stripe + Google APIs
- frame-src 'self' + Google/Facebook login + Stripe
- script-src 'self' 'unsafe-eval' 'unsafe-inline' + Google/Facebook/Stripe scripts
- style-src 'self' 'unsafe-inline'
- img-src 'self' data: blob: + cloudinary + firebase + Google + Facebook CDN
- frame-ancestors 'none' (good — no clickjacking)
- report-uri /api/v1/system/csp-report

**Weakness:** script-src includes 'unsafe-eval' and 'unsafe-inline' which significantly weakens XSS protection. Required for third-party scripts but overly permissive. Recommend nonce-based CSP.

#### 5.6 File Upload Security

- File uploads go through Cloudinary via multer-storage-cloudinary
- No explicit file type validation visible in upload routes
- No explicit file size limits beyond Next.js body parser defaults
- No virus/malware scanning on uploaded files
- Avatar upload uses Cloudinary which is appropriate for storage but lacks validation

#### 5.7 Dependency Security

- No Dependabot, Snyk, or security scanning tooling configured
- No npm audit in CI pipeline
- No Software Bill of Materials (SBOM) generation
- jose library is overridden to version 5.9.6 (via package.json overrides) — unusual, may indicate a dependency conflict resolution
- eslint v8 is used — End of Support (ESR) as of 2026, should be on v9
- Firebase Admin v14 is current; Firestore usage not fully inspected but is a known Google-maintained dependency

---

## 6. Authentication Audit

### 6.1 JWT Lifecycle

Login (email/password) -> bcrypt.compare -> issueSession -> {accessToken, refreshToken}
-> accessToken stored in memory (React state, not localStorage)
-> refreshToken stored in httpOnly Secure SameSite=Strict cookie
-> Access token used for API calls via Authorization: Bearer header
-> On expiry (15 min), client calls POST /api/v1/auth/refresh
-> Refresh token verified against JWT_REFRESH_SECRET, JTI checked against LoginSession
-> Token version incremented (rotation detected by LoginSession.tokenVersion mismatch)
-> Reuse detection: if tokenVersion mismatch occurs, session is revoked
-> New access + refresh tokens issued
-> Old refresh token becomes invalid (single-use)

### 6.2 Session Management

- Session Creation: IP, UA, device fingerprint, geolocation captured
- Session Revocation: Direct LoginSession.status update
- Session Persistence: 7-day TTL on inactive sessions via expireAfterSeconds
- Session Ownership: JTI in JWT binds token to specific session device
- Replay Protection: Token version increment on refresh; reuse detection
- Device Fingerprinting: SHA-256 hash of User-Agent header
- Concurrent Sessions: New session marks previous isCurrent=false (unless markOthersInactive=false)

### 6.3 OAuth Flow (Firebase)

Firebase Auth POSTs to /api/v1/auth/[provider] with Firebase ID Token
-> Server verifies with Firebase Admin SDK (verifyIdToken)
-> Finds existing user by firebaseUid OR email match
-> Links OAuth to existing account (email merge preserves publicId)
-> Converts guest accounts in-place (same _id, preserves all history)
-> Brand-new OAuth users get placeholder username + usernameSet=false (routed to /choose-username)
-> Creates LoginSession -> issues JWT tokens bound to session
-> Returns {payload, refreshToken, converted, sessionId}

### 6.4 Password Reset Flow

The password reset flow uses /api/v1/passwords/[..slug] routes. The authValidator includes forgotPasswordSchema and resetPasswordSchema schemas. The actual implementation of these route handlers was not fully traceable in the file listing — they exist at the /passwords/[..slug] route path but their implementation detail requires further verification.

### 6.5 Token Leakage Risks

- Access tokens in JS memory (not localStorage) — good for XSS resistance but lose tokens on page refresh
- Refresh tokens in httpOnly cookies — good for CSRF resistance
- 10-minute auth health check interval: fetch /api/v1/auth/refresh every 10 min means up to 10 min of stale token before auto-refresh
- No explicit token invalidation on password change — relies on token version bump via getSessionTokenVersion
- The frontend-auth.ts stores accessToken in a module-level variable (module-scoped, not localStorage), which means it is lost on page reload but also inaccessible to XSS in a strict sense
