# Security Audit — Elk Grove Soccer (sacramento.soccer)

**Date:** 2026-04-08  
**Scope:** Full-stack Next.js application on AWS Amplify handling youth player PII  
**Audience:** Site administrator / developer

---

## Executive Summary

This application handles sensitive PII for minors: names, birth dates, parent email addresses, phone numbers, and home addresses. The current security posture is **development-grade** in several critical areas and requires remediation before this system is used in a full production capacity with live parent email delivery.

---

## 🔴 Critical — Fix Immediately

### ✅ 1. Secrets Exposed in `next.config.ts` — FIXED 2026-04-08

~~All environment variables are forwarded via the `env: {}` block in `next.config.ts`, which bundles them into the **client-side JavaScript**.~~

**Resolution:** Removed the entire `env: {}` block from `next.config.ts`. All secrets are accessed via `process.env` server-side only.

---

### ✅ 2. Admin Password Stored and Compared as Plain Text — FIXED 2026-04-08

~~The admin login checks `password !== adminPassword` with no hashing.~~

**Resolution:** Password hashed with bcrypt (cost 12) in `lib/auth/password.ts`. Hash stored in `.env.local` and SSM `/egs/ADMIN_PASSWORD`. Comparison uses `bcrypt.compare()`.

---

### ⏳ 3. Single Shared Admin Password — No Per-User Accounts — DEFERRED

All coordinators share one password with no individual identity. There is no audit trail of which coordinator performed which action (assignment, import, email send).

**Fix:** Issue individual admin accounts (even if still simple username+password). Log the acting user on every write operation stored to DynamoDB or CloudWatch.

---

### ✅ 4. Timing-Safe Comparison Not Used for API Key — FIXED 2026-04-08

~~The API key check uses `key === process.env.ADMIN_API_KEY`, which is vulnerable to timing attacks.~~

**Resolution:** `requireAdminKey()` in `lib/api-helpers.ts` now uses `crypto.timingSafeEqual()`.

---

### ✅ 5. `/api/health` Leaks Environment Information — FIXED 2026-04-08

~~The health endpoint returns environment and database connection details publicly.~~

**Resolution:** Health endpoint now returns only `{ ok: true }` or `{ ok: false }`.

---

### ✅ 6. Write Routes Missing Auth Checks — FIXED 2026-04-08

~~`/api/fields/save` and `/api/fields/delete` had no authentication guard.~~

**Resolution:** Both routes now call `requireAdminKey()` and return 401 if the check fails.

---

### ⏳ 7. Rotate All Currently Exposed Credentials — PENDING

Credentials in `.env.local` were visible during this session. Treat as compromised and rotate:

- DynamoDB IAM Access Key / Secret — AWS IAM console
- Session Secret — generate new random value
- Anthropic API Key — console.anthropic.com
- Admin API Key
- Turnstile Secret Key
- Resend API Key

---

### 7. Rotate All Currently Exposed Credentials

The `.env.local` file contains live credentials. Even though it is gitignored, it has been readable on the local machine and may have been included in any backup, sync, or inadvertent push. Treat all current values as compromised and rotate:

- DynamoDB IAM Access Key / Secret
- Session Secret
- Admin Password
- Anthropic API Key
- Admin API Key
- Turnstile Secret Key
- Resend API Key

---

## 🟠 High Priority — Fix Before Full Production Launch

### 8. Children's PII Not Encrypted at Rest

DynamoDB tables storing player records (names, birth dates, parent contact info, addresses) should use encryption at rest. AWS DynamoDB supports this natively at zero cost.

**Fix:** Enable DynamoDB encryption at rest for all tables containing PII: `egs-players`, `egs-coaches`, `egs-assignments`, `egs-grand-assignments`, `egs-notifications`.

---

### 9. No Audit Logging of Admin Actions

There is no record of which admin accessed player records, ran the matching engine, overrode assignments, or triggered emails. For a system holding children's data, this is a compliance and accountability gap.

**Fix:** Write a structured log entry (to DynamoDB or CloudWatch Logs) for every admin action: who, what action, on which record, at what time. Retain logs for at least 1 year.

---

### 10. In-Memory Rate Limiting Not Distributed

The rate limiter in `middleware.ts` uses a per-process in-memory map. On AWS Amplify with multiple concurrent instances, each instance maintains its own counter — a brute-force attacker hitting different instances can exceed the limit with no resistance.

**Fix:** Use a shared store for rate limit state: Redis (ElastiCache), DynamoDB with a short TTL, or Upstash Redis (zero-infrastructure).

---

### 11. No CSRF Protection

Session cookies use `SameSite=Lax`, which blocks cross-site POST from external sites in most browsers. However, `Lax` does not protect against all CSRF vectors, and is browser-dependent.

**Fix:** Add a CSRF token header check (`x-csrf-token`) on all state-changing API routes, generated on page load and validated server-side.

---

### 12. No Security Response Headers (CSP, HSTS, etc.)

The application does not set:

- `Content-Security-Policy` — allows inline scripts and arbitrary external sources
- `Strict-Transport-Security` — does not enforce HTTPS for returning visitors
- `X-Frame-Options` — allows clickjacking by embedding in an iframe
- `X-Content-Type-Options` — allows MIME sniffing

**Fix:** Add a `headers()` export in `next.config.ts` with at minimum:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```
CSP will require additional work to enumerate allowed script/style sources.

---

### 13. No Input Validation on CSV Imports

CSV rows imported via `/api/players`, `/api/admin/import-coaches`, `/api/admin/import-teams` are inserted into DynamoDB with minimal checking. There is no schema validation, field length limiting, or character sanitization. Malicious or malformed data could corrupt records or cause downstream errors.

**Fix:** Add a Zod (or similar) schema that validates each row before insert: required fields present, date format correct, email format valid, phone number format valid, string lengths bounded.

---

### 14. Claude Assistant Can Return PII in Chat

The admin chat assistant (`/api/admin/chat`) has a `list_players` tool that returns player names, schools, and cities in its response. Those responses are streamed to the browser and logged in the chat history. If a coordinator's screen is shared or the session is hijacked, PII is exposed in the UI.

**Fix:** Add a system prompt instruction to minimize PII in natural language responses. Log only tool call metadata (not full player data) in any persistent chat history.

---

### 15. Session Validation Duplicated Across 8+ Routes

Session checking logic is re-implemented in each admin API route instead of being handled once in middleware. Duplicated code introduces the risk that a future route is added without the check.

**Fix:** Centralize session validation in `middleware.ts` for all `/api/admin/*` paths. Individual routes should not need to re-validate the session.

---

### 16. No Data Retention or Deletion Policy

Player records from prior seasons remain indefinitely in DynamoDB. There is no mechanism to delete or anonymize records after a season ends. Under California privacy law (CCPA) and general best practice, data for minors should be deleted when no longer needed.

**Fix:** Define and document a retention schedule (e.g., delete player PII 12 months after season end). Implement a scheduled Lambda or admin tool to purge expired records.

---

## 🟡 Medium Priority — Good Hygiene

### 17. No Email Validation on Contact Form

The contact form does not validate the email field server-side. An invalid or spoofed Reply-To address could confuse staff.

**Fix:** Validate email format server-side with a regex or library before sending.

---

### 18. No File Size or Row Count Limits on Imports

CSV imports have no enforced ceiling on rows or request body size, which could allow a memory or timeout attack via an oversized payload.

**Fix:** Add a `maxRows` check (e.g., 2000 players per import) and set a `bodyParser` size limit in the route config.

---

### 19. AWS IAM Over-Privileged Credentials

The DynamoDB IAM key in use appears to be a long-lived access key. Long-lived keys are higher risk if rotated infrequently.

**Fix:** Replace the IAM user key with an IAM Role attached to the Amplify deployment (instance profile). This eliminates the need for long-lived credentials in environment variables entirely. If a key must be used, scope it to the minimum necessary DynamoDB actions on only the required tables.

---

### 20. `egs-notifications` Table Stores Intended Parent Emails in Test Mode

Even in test mode (where all emails go to the test address), the `egs-notifications` log table records the intended parent email and player name for every send. This is a correct audit trail, but it means PII is accumulating in a log table during testing.

**Fix:** Ensure this table is also covered by the encryption at rest and retention policy decisions above. Document clearly that this table contains PII.

---

## ✅ What Is Already Done Well

- Session cookies are `HttpOnly`, `Secure`, and `SameSite=Lax` — protects against XSS-based session theft
- Rate limiting exists on login (5 attempts / 15 min) and write endpoints
- Session tokens expire after 24 hours
- Cloudflare Turnstile CAPTCHA on the public contact form
- Production secrets are retrieved from AWS SSM Parameter Store at runtime (5-minute cache) — this is the right pattern; it just needs to be extended to ALL secrets
- DynamoDB access goes through a singleton client — not raw HTTP calls
- `.env.local` is gitignored — secrets are not in the git history
- No `eval`, `innerHTML`, or `dangerouslySetInnerHTML` patterns found
- Email is currently in test mode — parents are not yet being emailed live, giving time to harden before launch

---

## Remediation Priority Order

| Priority | Item | Effort | Status |
|----------|------|--------|--------|
| 🔴 Immediate | Remove secrets from `next.config.ts` env block | Low | ✅ Fixed |
| 🔴 Immediate | Hash admin password with bcrypt | Low | ✅ Fixed |
| 🔴 Immediate | API key timing-safe comparison | Low | ✅ Fixed |
| 🔴 Immediate | Fix `/api/health` auth | Low | ✅ Fixed |
| 🔴 Immediate | Fix `/api/fields/save` and `/api/fields/delete` auth | Low | ✅ Fixed |
| 🔴 Immediate | Error messages leaking internals (6 routes) | Low | ✅ Fixed |
| 🔴 Immediate | Unvalidated body written to DynamoDB (10 routes) | Low | ✅ Fixed |
| 🔴 Immediate | PII (player names) logged to CloudWatch | Low | ✅ Fixed |
| 🔴 Immediate | Rotate all exposed credentials | Low | ⏳ Pending |
| 🔴 Immediate | Per-user admin accounts | High | ⏳ Deferred |
| 🟠 Before Launch | Enable DynamoDB encryption at rest | Low | — |
| 🟠 Before Launch | Add audit logging | Medium | — |
| 🟠 Before Launch | Add security response headers | Low | — |
| 🟠 Before Launch | Add input validation (Zod) to CSV imports | Medium | — |
| 🟠 Before Launch | Centralize session validation in middleware | Medium | — |
| 🟠 Before Launch | Distributed rate limiting | Medium | — |
| 🟡 Good Practice | CSRF tokens | Medium | — |
| 🟡 Good Practice | IAM role instead of access key | Medium | — |
| 🟡 Good Practice | Data retention/deletion policy | High | — |
| 🟡 Good Practice | File/row size limits on imports | Low | — |

---

## Compliance Note

This application collects and stores personal data for minors. Depending on jurisdiction and the age of players, **COPPA** (federal, ages under 13) and **CCPA** (California) may apply. Both require:

- Documented data retention limits
- A process for parents to request deletion of their child's data
- Clear disclosure of what data is collected and why
- No sharing of children's data with third parties beyond operational necessity

Anthropic's API receives tool call results that may include player names and school names. Confirm Anthropic's data processing terms are acceptable for this use case, and consider stripping PII from tool results before they are sent to the model.

---

*This document was generated from a manual architecture review of the source code as of 2026-04-08. It is not a penetration test. Additional vulnerabilities may exist.*
