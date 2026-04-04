# Elk Grove Soccer — AI Handoff Reference

Live site: **https://sacramento.soccer**
Repository: **https://github.com/wil4pres/elk-grove-soccer**
Amplify App ID: **d1gz6r6mjgacrf**
AWS Account: **532180544564** | CLI Profile: **elkgrovesoccer**

---

## Why This Exists — The Business Case

Elk Grove Soccer is a NorCal Premier youth soccer club serving hundreds of families across the greater Sacramento area. Before this site, the club had no unified digital presence. Parents called in on game day to ask if fields were open. Coordinators manually assigned hundreds of players to teams by hand using spreadsheets. Staff managed programs and sponsors through email chains and manual updates. There was no single source of truth.

This site was built to solve those problems:

**The problems it solves:**

- **Field chaos on game day** — Parents arriving at closed or delayed fields with no warning. The field status system gives coordinators a single place to update status in real time, and gives parents a live view from anywhere.
- **Registration confusion** — Families didn't know which program was right for their kid's age and level. The program finder quiz and tiered program pages make discovery self-serve.
- **Manual team matching** — Coordinators spent days manually reading through hundreds of free-text special requests (coach preferences, friend requests, sibling groups, proximity) and cross-referencing spreadsheets. The matching tool automates scoring and surfaces suggestions — and the end goal is zero coordinator involvement: full auto-assignment at registration time with an email sent directly to the parent.
- **No staff-facing tools** — Any content change required a developer. The admin panel gives non-technical staff full control over fields, programs, sponsors, alumni, and staff profiles.
- **No community presence** — Alumni stories, sponsor recognition, and staff profiles build trust with families considering the club.

**Who uses this site:**

- **Parents** — Game day: field status, weather, maps, schedule. Off-season: program discovery, registration.
- **Players** — Program info, schedules.
- **Club coordinators (admin)** — Update field status, manage programs, run the team matching tool.
- **Club staff** — Update their own profiles; view sponsor and alumni records.
- **Sponsors** — Their logos and links appear on the public site.

**Why it matters to the business:**

- A family that can't find field status in 10 seconds on their phone calls the front desk — or doesn't show up. Every friction point costs trust.
- Registration revenue depends on families finding and understanding the right program. A confusing site means lost registrations.
- The matching tool directly saves coordinator time — what previously took days of manual work now takes hours.
- A professional web presence helps the club compete with larger regional clubs for player recruitment and sponsor partnerships.

**Current season:** Spring 2026

---

## Goals & Rules

### Product Goals

1. Give parents a fast, mobile-first game-day companion — field status, directions, schedule, weather
2. Help families discover and register for the right program (Future Stars → Academy)
3. Let staff manage field status, programs, sponsors, and rosters without touching code
4. Build trust and community through staff profiles, alumni stories, and sponsor recognition
5. Be installable as a PWA on iOS and Android for sideline use
6. Automate team assignment end-to-end — player registers → system scores and assigns → parent receives email confirmation, no coordinator intervention required

### UX Rules — Do Not Violate

- **Speed first.** The site is used on mobile, on a sideline, under stress. Every public page must load fast. No blocking network calls in the critical path.
- **Field status is the most important piece of data on game day.** It must be visible on the home page without scrolling and always reflect the latest DynamoDB value — never cached stale.
- **Parents are not technical users.** No jargon, no complex navigation. Plain language throughout.
- **Admin is for staff, not developers.** Every admin action must be achievable without reading documentation or touching code.
- **Never break the admin auth flow.** The cookie/JWT mechanism is fragile due to Amplify's CloudFront behavior. Do not refactor auth without fully understanding the Amplify Set-Cookie constraint (see Auth Flow section).

### Design Rules — Do Not Violate

- Use the color token system exclusively — never raw hex values in components.
- Public pages are always dark-mode (midnight/pine backgrounds). Admin pages are always light-mode. Never mix.
- The design tone is community-first and warm — never cold, corporate, or generic.
- Mobile layout is designed first. Desktop is an enhancement.
- Decorative blur blobs and gradient text are intentional brand elements — use them on hero sections.

### Engineering Rules — Do Not Violate

- Server components by default. `'use client'` only for interactive UI.
- `export const dynamic = 'force-dynamic'` on every page that reads live DynamoDB or schedule data. Missing this causes CloudFront to serve stale data.
- Never use module-level `await` for AWS SDK calls — Amplify SSR Lambda cold-starts will fail silently.
- The `matching/` directory is excluded from the Next.js TypeScript build. It contains standalone CLI scripts, not app code. Do not move matching scripts into the app.
- `matching/report.html` must be committed to git — Amplify bundles it via `outputFileTracingIncludes`. It is not generated at runtime.
- All new env vars must be added to both Amplify's branch environment settings AND `next.config.ts`'s `env` block, or they will be undefined in SSR.
- Do not change Amplify cache type to `AMPLIFY_MANAGED_NO_COOKIES` — it breaks admin session cookies.

---

## Design System & UX Philosophy

### Tone
- Friendly and community-first, not corporate
- Confident but not boastful — this is a neighborhood club with serious ambitions
- Clear hierarchy: parents and kids come first, admin second

### Color Tokens (defined in `app/globals.css` via Tailwind 4 `@theme`)
| Token | Hex | Usage |
|-------|-----|-------|
| `midnight` | `#080d1a` | Page background |
| `pine` | `#071428` | Cards, sections |
| `leaf` | `#0080ff` | Primary CTA blue |
| `aqua` | `#4db3ff` | Gradient accent |
| `sunset` | `#ff8900` | Warm accents, LIVE NOW |
| `cloud` | `#f9fbff` | Body text |
| `rose` | `#ff3333` | Errors, closures |
| `amber` | `#e07800` | Warnings, delays |

Use these CSS tokens everywhere (`text-leaf`, `bg-pine`, etc.) — never raw hex in components.

### Typography
- **Font:** Space Grotesk (Google Fonts) — `--font-space-grotesk`
- **Headings:** Bold, tight tracking, often gradient (`from-leaf to-aqua` or `from-cloud to-aqua`)
- **Body:** `text-cloud/70` or `text-cloud/60` for secondary text

### Component Patterns
- **Hero sections:** Full-bleed gradient `from-pine to-midnight`, decorative blur blob, badge pill, `h1` with gradient text, subtitle, CTA buttons
- **Cards:** `bg-pine/40 border border-white/[0.08] rounded-3xl` — glass-style dark cards
- **Badges:** `rounded-full px-2.5 py-0.5 text-xs font-semibold` inline status pills
- **Buttons (primary):** `bg-leaf text-white rounded-full px-6 py-3 font-semibold`
- **Buttons (secondary):** `border border-white/20 text-cloud/80 rounded-full px-6 py-3`
- **Admin UI:** Light mode — `bg-gray-50`, white cards, `border-gray-200`, `text-gray-900`

### Layout
- Max content width: `max-w-5xl mx-auto px-4` (admin), `max-w-7xl` (public pages)
- All public pages include: `SiteHeader` + `SiteFooter` (from root layout)
- Admin pages include: `AdminNav` (sticky top bar, dark) + admin layout — **no** site header/footer
- Mobile-first responsive: `sm:` tablet, `lg:` desktop breakpoints

### Navigation Structure (Header)
- Play (→ `/programs`)
- Register (→ `/register`)
- Field Status (→ `/field-status`) — live dot indicator
- Maps & Schedules (→ `/maps`)
- Alumni (→ `/alumni`) — *page not yet built*
- Sponsors (→ `/sponsors`) — *page not yet built*
- CTA button: "Register 2026" (→ `/register`)
- Mobile: hamburger with `aria-label="Open menu"`

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.1 (App Router) |
| Language | TypeScript |
| React | 19.2.4 |
| Styling | Tailwind CSS 4 (no config file — uses `@theme` in globals.css) |
| Database | AWS DynamoDB (live data) + SQLite via better-sqlite3 (matching tool, local only) |
| Auth | JWT (jose) — password-only admin auth |
| Schedule data | Google Sheets CSV export |
| Weather | Open-Meteo API (free, no key — 15 min revalidation) |
| Email | Resend — used by `/api/contact` to forward contact form submissions |
| Spam protection | Cloudflare Turnstile — on contact form |
| Hosting | AWS Amplify (SSR) |
| Domain | sacramento.soccer (www + apex via Amplify) |
| Testing | Playwright (tests against live production) |

### Key Architecture Rules
- **Server components by default.** Use `'use client'` only for interactive UI (filters, forms, menus).
- **`export const dynamic = 'force-dynamic'`** on any page that reads live data (fields, schedule, programs). This bypasses CloudFront's static cache.
- **Never use module-level `await`** for AWS SDK calls — Amplify SSR Lambda cold-starts will fail. Use dynamic `import()` inside functions (see `lib/secrets.ts`).
- **No API key for Google Maps embeds** — use `https://www.google.com/maps?q=ADDRESS&output=embed` iframe pattern.
- **`matching/` is excluded from the Next.js TypeScript build** (`tsconfig.json`) — those are standalone CLI scripts that use `process.exit()` guards TypeScript can't flow-narrow through.

---

## File Map

```
elk-grove-soccer/
├── app/
│   ├── layout.tsx              # Root layout — SiteHeader + SiteFooter + PWA script
│   ├── globals.css             # Tailwind 4 @theme tokens, global utilities
│   ├── page.tsx                # Home page — hero + game day cards (live schedule + fields + weather)
│   ├── programs/page.tsx       # Programs page — finder quiz + level sections + program cards
│   ├── register/page.tsx       # Registration page — program cards + FAQ
│   ├── field-status/page.tsx   # Field status page — live DynamoDB data
│   ├── maps/page.tsx           # Maps page — Google Maps embeds + live schedule filter
│   ├── staff/page.tsx          # Staff/coordinators page — DynamoDB data
│   ├── contact/
│   │   ├── page.tsx            # Contact page — info cards + office hours + form
│   │   └── _components/
│   │       └── contact-form.tsx  # Client component — Turnstile + Resend submission
│   ├── admin/
│   │   ├── layout.tsx          # Admin layout — wraps all /admin/* routes (no site header)
│   │   ├── page.tsx            # Admin dashboard — links to all 6 sections
│   │   ├── login/page.tsx      # Login page (client component — calls /api/admin/login)
│   │   ├── fields/             # Field status CRUD
│   │   ├── programs/           # Programs CRUD
│   │   ├── sponsors/           # Sponsors CRUD
│   │   ├── alumni/             # Alumni CRUD
│   │   ├── staff/              # Staff CRUD
│   │   ├── matching/page.tsx   # Full-viewport iframe of matching/report.html (auth-gated)
│   │   └── _components/        # Shared admin UI (AdminNav, ConfirmDelete, StatusButtons)
│   └── api/
│       ├── admin/login/route.ts         # POST — validates password, sets JWT cookie
│       ├── admin/logout/route.ts        # POST — clears cookie
│       ├── admin/matching-report/route.ts  # GET — serves matching/report.html (auth-gated)
│       ├── contact/route.ts             # POST — Turnstile verify + Resend email forward
│       ├── fields/                      # REST endpoints for field data
│       ├── programs/                    # REST endpoints for program data
│       ├── sponsors/                    # REST endpoints
│       ├── alumni/                      # REST endpoints
│       ├── staff/                       # REST endpoints
│       └── health/                      # GET /api/health — returns ok
├── components/
│   ├── site-header.tsx         # Public nav — responsive, mobile hamburger
│   ├── site-footer.tsx         # Footer — links, copyright
│   ├── hero.tsx                # Home page hero — live field status + next match/no games
│   ├── schedule-filter.tsx     # Client component — search + date/age/gender/venue filters
│   ├── program-finder.tsx      # Client component — 4-step quiz to find right program
│   ├── program-card.tsx        # Program card — price, status, highlights
│   ├── game-day-card.tsx       # Home page game day info cards
│   ├── field-status-banner.tsx # Field open/delay/closed banner
│   ├── mobile-quick-actions.tsx
│   ├── sponsor-strip.tsx
│   └── trust-strip.tsx
├── lib/
│   ├── dynamo.ts               # DynamoDB client (uses DYNAMO_ACCESS_KEY_ID env var)
│   ├── schedule.ts             # Google Sheets CSV fetch + parser + filters
│   ├── data.ts                 # getPrograms(), getFields(), getStaff() from DynamoDB
│   ├── fieldStatus.ts          # Field status helpers
│   ├── weather.ts              # Open-Meteo fetch — getElkGroveWeather(), getAllCitiesWeather()
│   ├── programs.ts             # Program types + mockPrograms fallback
│   ├── sponsors.ts             # Sponsor types
│   ├── alumni.ts               # Alumni types
│   ├── api-helpers.ts          # Shared API route utilities
│   ├── secrets.ts              # SSM Parameter Store wrapper (falls back to env vars)
│   └── auth/
│       ├── config.ts           # Cookie name, session duration, protected routes
│       ├── service.ts          # AuthService class — login, logout, verifySession
│       ├── session.ts          # JWT create/verify/refresh (jose)
│       ├── password.ts         # validatePassword() — compares to ADMIN_PASSWORD env var
│       └── types.ts            # AuthResult, SessionPayload, etc.
├── matching/                   # Standalone coordinator tooling — NOT part of Next.js build
│   ├── schema.sql              # SQLite schema for matching.db
│   ├── matching.db             # Local SQLite database (not committed to git)
│   ├── import.ts               # Import historical PlayMetrics data (2025)
│   ├── import-2026.ts          # Import 2026 registrations
│   ├── import-practice-fields.ts  # Import practice field assignments per team
│   ├── extract-requests.ts     # AI (Claude) parses free-text special requests → structured JSON
│   ├── geocode-fields.ts       # Geocode practice fields via OpenRouteService
│   ├── geocode-players.ts      # Geocode player addresses via OpenRouteService
│   ├── calculate-distances.ts  # Road-network distance matrix (player ↔ field)
│   ├── generate-report.ts      # Build static report.html — scoring + suggestions per player
│   ├── generate-email-preview.ts  # Preview/send clarification emails to families
│   ├── queries.ts              # Shared SQLite query helpers
│   └── report.html             # Generated output — served at /api/admin/matching-report
├── middleware.ts               # Rate limiting + /admin/* auth guard (redirects to /admin/login)
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   ├── favicon.svg             # TODO: redesign — currently not a clear soccer ball
│   └── icons/                  # PWA icons (icon-192.png, icon-512.png)
├── tests/
│   └── site.spec.ts            # Playwright tests — run against live production
├── playwright.config.ts        # baseURL: https://sacramento.soccer
├── tsconfig.json               # matching/ excluded from type-checking
└── next.config.ts              # outputFileTracingIncludes bundles matching/report.html for Amplify SSR
```

---

## Data Layer

### DynamoDB Tables (region: us-east-1)
| Table | Key | Fields |
|-------|-----|--------|
| `egs-fields` | `id` (string) | name, complex, status (open/delay/closed), notes, updatedAt, updatedBy |
| `egs-programs` | `id` (string) | name, level, ageBand, season, price, capacity, enrolled, registrationStatus, opensDate, description, highlights[], commitment, whoIsItFor |
| `egs-sponsors` | `id` (string) | name, tier, logoUrl, website, active |
| `egs-alumni` | `id` (string) | name, gradYear, club, achievement, photoUrl |
| `egs-staff` | `id` (string) | name, role, ageGroup, bio, photoUrl, email |

### Matching Tool — Local SQLite (`matching/matching.db`)

Used by coordinators to generate player-to-team assignment suggestions. Run locally; output (`report.html`) is committed and served auth-gated at `/admin/matching`.

| Table | Purpose |
| ----- | ------- |
| `seasons` | Season reference (name, year, is_current) |
| `teams` | One row per team per season — gender, birth year, coach parsed from name |
| `players` | Master player records from PlayMetrics — address, email, contact |
| `registrations` | One row per player per season — package, school, special request, new/returning |
| `team_assignments` | Historical: which player was on which team per season |
| `coaches` | Coach roster per team per season |
| `request_extractions` | AI-parsed special requests — coaches[], friends[], teams[] as JSON arrays |

**Matching pipeline (run locally before each season):**

1. `import-2026.ts` — import registrations from PlayMetrics CSV
2. `import-practice-fields.ts` — import practice field per team
3. `geocode-fields.ts` / `geocode-players.ts` — geocode via OpenRouteService
4. `calculate-distances.ts` — road-network distance matrix
5. `extract-requests.ts` — Claude parses free-text special requests
6. `generate-report.ts` — score + rank teams per player → `report.html`
7. Commit `report.html` → push → deploy → visible at `/admin/matching`

### Live Schedule — Google Sheets CSV
- Sheet ID: `16bRzFp0IghrxTgSmLwrPymM9goh8fx5kXadiRTlXhaI`
- GID: `1891176485`
- Revalidates every **60 seconds** via `{ next: { revalidate: 60 } }`
- Returns `null` if sheet is unreachable → UI shows "Pending Schedule Soon"
- Returns `[]` if sheet reachable but no matches → UI shows "No Games Today"
- `filterCurrentAndFuture()` drops matches where kickoff + 1 hour is in the past

### Weather — Open-Meteo

- Free API, no key required. Fetches current conditions (temp °F, UV index, wind speed/direction, WMO weather code).
- Revalidates every **15 minutes** (`{ next: { revalidate: 900 } }`).
- Cities: Elk Grove, Sacramento, Galt, Rancho Cordova, Rancho Murieta.
- `getElkGroveWeather()` used on home page game-day card; `getAllCitiesWeather()` available for multi-city display.

### Contact Form — Resend + Cloudflare Turnstile

- `POST /api/contact` — verifies Turnstile token, then sends email via Resend.
- From: `contact@sacramento.soccer` → To: `info@elkgrovesoccer.com`, reply-to set to submitter.
- Honeypot field silently accepts bot submissions without sending.
- Env vars required: `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`.

### Auth Flow

1. User POSTs to `/api/admin/login` with `{ password }`
2. Server validates against `ADMIN_PASSWORD` env var, creates a JWT signed with `SESSION_SECRET`
3. JWT is set as `httpOnly; secure; sameSite=lax; path=/; maxAge=86400` cookie named `admin_session`
4. Middleware at `middleware.ts` intercepts all `/admin/*` (except `/admin/login`, `/admin/logout`), verifies JWT
5. Invalid/missing token → redirect to `/admin/login`
6. Tokens expiring within 30 min are automatically refreshed

**Why API route, not server action:** Amplify's CloudFront distribution stripped `Set-Cookie` headers from server action 303 redirects. Using a 200 response from an API route reliably delivers the cookie.

### Rate Limiting

`middleware.ts` also enforces in-memory sliding-window rate limits:

- `/api/admin/login` — 5 requests per 15 min (brute-force protection)
- `/api/health` — 10 requests per min

---

## AWS / Amplify Configuration

### Environment Variables (set at branch level on Amplify `main`)
```
DYNAMO_REGION=us-east-1
DYNAMO_ACCESS_KEY_ID=<IAM key for egs-dynamo-access user>
DYNAMO_SECRET_ACCESS_KEY=<secret>
ADMIN_PASSWORD=<admin login password>
SESSION_SECRET=<64-char hex string for JWT signing>
ADMIN_API_KEY=<API key for programmatic access>
TURNSTILE_SECRET_KEY=<Cloudflare Turnstile secret key>
RESEND_API_KEY=<Resend API key>
```

**Note:** AWS SSM Parameter Store parameters exist at `/egs/SESSION_SECRET` and `/egs/ADMIN_PASSWORD` but are **NOT accessible** at Amplify SSR Lambda runtime (the Lambda doesn't inherit the Amplify service role). The code checks `process.env.X` first and falls back to SSM — in practice, env vars always win.

### Cache Config

- Amplify cache type: `AMPLIFY_MANAGED` (allows cookies to pass through CloudFront)
- Do **not** change to `AMPLIFY_MANAGED_NO_COOKIES` — this strips session cookies and breaks admin auth

### IAM

- Service role: `egs-amplify-ssr-role` — used for **build** only, not SSR runtime
- Runtime DynamoDB access: `egs-dynamo-access` IAM user with `egs-dynamo-policy` (PutItem, GetItem, UpdateItem, DeleteItem, Scan on all egs-* tables)

---

## Running Tests

Tests run against the **live production site** at `https://sacramento.soccer`.

```bash
cd elk-grove-soccer
npx playwright test                    # run all tests
npx playwright test --grep "Admin"     # run only admin tests
npx playwright test --headed           # open browser (debugging)
```

Test results saved to `test-results/`. Screenshots on failure only.

---

## Pages Not Yet Built

These routes are linked in nav/footer but return 404:

| Route | Description |
|-------|-------------|
| `/alumni` | Alumni success stories — data table `egs-alumni` exists, admin CRUD exists |
| `/sponsors` | Sponsor showcase — data table `egs-sponsors` exists, admin CRUD exists |
| `/volunteer` | Volunteer signup |
| `/about` | Club history and mission |

**Pattern to follow for new public pages:** copy the hero + card pattern from `app/field-status/page.tsx`. Always add `export const dynamic = 'force-dynamic'` if reading from DynamoDB.

---

## Matching — Ultimate Vision (Where This Is Heading)

The current matching tool (`matching/` CLI scripts + `report.html`) is a **stepping stone**, not the destination. It still requires a coordinator to run scripts locally, review a report, and manually enter assignments in PlayMetrics.

**The end goal: fully automated, event-driven, hands-off team assignment.**

When a parent completes registration, the system should:

1. Detect the new registration (webhook from PlayMetrics, or polling trigger)
2. Run the scoring engine against all eligible teams for that player — proximity to practice field, coach/friend/sibling requests, capacity, birth year, gender
3. Assign the player to the top-scoring team with open capacity
4. Send the parent a confirmation email (via Resend) with: team name, head coach, practice field and address, first practice date if known
5. Update the assignment automatically if relevant data changes (coach reassigned, field changes, sibling registered to same team)

**What coordinators should do instead of manual work:**

- Handle exceptions — players with no matching team (full capacity, unusual age/gender)
- Override suggestions when they have context the algorithm doesn't
- Monitor a dashboard of in-progress assignments, exceptions, and emails sent

**Current state vs. target:**

| Capability | Now | Target |
| ---------- | --- | ------ |
| Score players against teams | ✅ CLI script | ✅ Same engine, API-driven |
| Assign players | ❌ Manual in PlayMetrics | ✅ Automatic on registration |
| Notify parents | ❌ Manual | ✅ Automated email via Resend |
| Handle new registrations | ❌ Batch run before season | ✅ Real-time as registrations arrive |
| React to data changes | ❌ Re-run full batch | ✅ Event-driven re-score and re-notify |
| Coordinator involvement | ❌ Required for every player | ✅ Exceptions and overrides only |

**What needs to be built to get there:**

- Registration ingestion trigger (PlayMetrics webhook or scheduled polling)
- Assignment engine as an API endpoint (not a local CLI script) backed by DynamoDB, not SQLite
- Team capacity tracking in DynamoDB (current enrollment vs. max)
- Email template for assignment confirmation (parent-facing, clear, friendly)
- Admin dashboard: assignment queue, exception list, override controls, email log
- Re-scoring logic when team data changes (coach, field, capacity)

**Design constraint:** The scoring logic in `matching/generate-report.ts` and `matching/queries.ts` already works well. The migration path is to port that logic into a DynamoDB-backed API route, not rewrite it.

---

## Target Platform Architecture

The long-term system is a **custom AWS-hosted assignment platform** that uses **SportsEngine as the official operational data system** and **AWS as the custom intelligence and workflow layer**. The current Next.js site and local SQLite matching tool are the foundation — this defines where they evolve to.

### Core Principle

Use SportsEngine as the operational system of record for club data that already fits its platform model: organizations, profiles, registrations, registration results, teams, rosters, events, and venues/subvenues. SportsEngine's docs describe those as core/interconnecting platform objects — they expose them through GraphQL, support webhook notifications for data changes, and support both user-based and organization-based OAuth flows for app access.

Use AWS as the custom application layer for everything that is the secret sauce:

- Scoring logic
- AI-generated recommendations
- Audit trail
- Override workflow
- Admin UI
- Outbound email orchestration
- Custom reporting
- "Why this player was placed here" explanations

That split gives you automation without trying to bend SportsEngine into being your app database.

### High-Level Architecture

```text
Parents / Admins / Coordinators
          |
          v
Custom Web App (Next.js)
Hosted on AWS Amplify
          |
          v
API Layer (API Gateway + Lambda)
          |
          +----------------------------------+
          |                                  |
          v                                  v
SportsEngine GraphQL API            AWS Data Layer
(source of truth for club data)     (custom app + AI memory)
          |                                  |
          |                                  +--> DynamoDB (assignments, audit, workflow)
          |                                  +--> S3 (raw payloads, reports)
          |                                  +--> SES (parent email)
          |                                  +--> SQS (async event processing)
          |
          +--> Webhooks push events into SQS on registration, roster change, etc.
```

### System Boundaries — What Each System Owns

**SportsEngine is the source of truth for all official sports records:**

- Organizations, profiles, registrations, registration results
- Teams, rosters, events, venues and sub-venues
- Receives writes for official player-to-team assignments — the assignment is not official until SportsEngine confirms the write succeeded
- Accessed via GraphQL API; events delivered via webhooks

**AWS is the source of truth for intelligence, workflow, and audit:**

- Webhook ingestion and idempotent event processing
- Assignment scoring engine and reassignment engine
- AI-generated explanations and supporting notes for each suggestion
- Manual override workflow with coordinator justification
- Full audit history — every decision, every input, every outcome
- Email notifications to parents
- Reporting and admin dashboard

### Infrastructure

| Layer | Technology |
| ----- | ---------- |
| Frontend | Next.js + Tailwind, hosted on AWS Amplify |
| Backend API | API Gateway + Lambda (TypeScript) |
| Async processing | SQS — webhook and event queues |
| Primary data store | DynamoDB — assignment state, audit log, workflow records, override history |
| Archive / reports | S3 — raw webhook payloads, generated HTML/PDF reports |
| Email | Amazon SES |
| Admin auth | AWS Cognito |
| SportsEngine access | SportsEngine OAuth |

### Critical Design Rules — Never Violate

- **SportsEngine is canonical for sports records. AWS is canonical for scoring, reasoning, audit, and messaging.** Never store official roster state only in DynamoDB — it must flow back to SportsEngine.
- **Store all SportsEngine IDs** on every AWS record (org ID, profile ID, registration ID, team ID, roster ID) so records can always be reconciled.
- **Webhook processing must be idempotent.** Duplicate deliveries from SportsEngine must produce no side effects. Use event ID deduplication on SQS/DynamoDB.
- **A recommendation is not an official assignment until the SportsEngine roster write succeeds.** Treat the write result as the commit point. If it fails, the player is unassigned in AWS too.
- **Every assignment decision must be fully auditable.** Store: all scoring inputs, full score breakdown, rule version used, final team selected, SportsEngine write result, timestamp, and actor (system or coordinator name if overridden).

### Assignment Flow (Target)

```text
SportsEngine registration webhook
        ↓
SQS queue (raw payload archived to S3)
        ↓
Lambda: validate, deduplicate, enrich from DynamoDB
        ↓
Scoring engine: proximity + requests + siblings + capacity + coach match
        ↓
AI layer: generate human-readable explanation for coordinator / parent
        ↓
DynamoDB: store recommendation + audit record
        ↓
If auto-assign: write roster entry to SportsEngine API
        ↓
On SportsEngine success: mark assigned in DynamoDB, send parent email via SES
        ↓
On SportsEngine failure: flag as exception, notify coordinator via admin dashboard
```

### When Human Review Is Required

The system escalates to coordinator review (instead of auto-assigning) when:

- No eligible team has open capacity for the player's birth year and gender
- Player has a conflict with a previously matched sibling on the same team
- Special request references a coach or friend that the scoring engine couldn't resolve with confidence
- SportsEngine write fails after retries

### Data Model — Key DynamoDB Tables (Future State)

| Table | Purpose |
| ----- | ------- |
| `egs-registrations` | Ingested registration events from SportsEngine webhooks |
| `egs-assignments` | Current assignment state per player per season — team, score, status, SportsEngine write result |
| `egs-audit` | Immutable log of every decision — inputs, scores, rule version, outcome, actor |
| `egs-teams` | Team records synced from SportsEngine — capacity, coach, practice field, birth year, gender |
| `egs-overrides` | Coordinator manual overrides — original suggestion, override value, justification, timestamp |
| `egs-notifications` | Email log — recipient, template, send time, SES message ID, delivery status |

---

## Known Issues / TODOs

1. **Favicon** — `public/favicon.svg` doesn't clearly resemble a soccer ball. Needs redesign.
2. **Programs data** — Currently uses `mockPrograms` from `lib/programs.ts` as fallback when DynamoDB returns empty. Real programs should be added via `/admin/programs`.
3. **Registration** — The Register page shows program cards but has no actual payment/enrollment integration. A link to an external registration platform (SportsEngine, etc.) is the expected solution.
4. **Alumni / Sponsors pages** — Tables exist, admin CRUD exists, public pages not built.
5. **Mobile app** — The site is PWA-installable. Full native app (React Native / Expo) would be a future project.
6. **Staff photos** — Staff profiles support `photoUrl` but many entries may have placeholder or empty values.

---

## Deployment

Push to `main` branch → Amplify auto-deploys (build + SSR). Build takes ~3 minutes.

```bash
git push origin main
# Check status:
aws amplify list-jobs --app-id d1gz6r6mjgacrf --branch-name main --profile elkgrovesoccer --max-results 1
```

No manual deploy steps needed. All env vars are set at the branch level in Amplify console.

**Note on matching report:** `matching/report.html` must be committed to git for Amplify to bundle it. It's referenced in `next.config.ts` via `outputFileTracingIncludes` so the SSR Lambda includes it. To update the report: run `npx tsx matching/generate-report.ts`, commit `matching/report.html`, push.
