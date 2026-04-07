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
ANTHROPIC_API_KEY=<Anthropic API key — required for AI special-request extraction on AWS>
ORS_API_KEY=<OpenRouteService API key — required for road-network distance calculation>
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

### Data Model — Complete DynamoDB Table Set (Future State)

**Existing tables — unchanged:**

| Table | Purpose |
| ----- | ------- |
| `egs-fields` | Field status — open/delay/closed, managed via admin |
| `egs-programs` | Program catalog — pricing, capacity, registration status |
| `egs-sponsors` | Sponsor records |
| `egs-alumni` | Alumni stories |
| `egs-staff` | Staff profiles |

**New platform tables — additive, nothing existing breaks:**

| Table | Purpose |
| ----- | ------- |
| `egs-webhook-events` | Idempotency log — every SE webhook event ID recorded on arrival, prevents duplicate processing |
| `egs-se-registrations` | Raw registration events ingested from SE webhooks — one record per registrationResult, archived payload |
| `egs-se-teams` | Teams synced from SportsEngine — coach, practice field, birth year, gender, lat/long, max capacity, current enrollment counter |
| `egs-assignments` | Assignment state per player per season — scoring inputs, score breakdown, rule version, assigned team, SE write result, status (pending/assigned/exception/overridden) |
| `egs-audit` | Immutable append-only log — every decision event: scoring run, assignment write, override, re-assignment, email sent, parent reply received |
| `egs-overrides` | Coordinator manual overrides — original suggestion, new team, justification text, coordinator ID, timestamp |
| `egs-notifications` | Outbound email log — recipient, template used, send time, SES message ID, delivery status |
| `egs-inbound-messages` | Parent email replies and responses — linked to player, assignment, and original notification |
| `egs-oauth-tokens` | SportsEngine OAuth tokens per admin user — access token, refresh token, expiry, scope |
| `egs-capacity` | Real-time enrollment counters per team per season — atomic increments/decrements as assignments are written or reversed |

**Lat/long schema (on `egs-se-teams` and carried into `egs-assignments`):**

```typescript
{
  practiceFieldId: string       // SE venue ID
  practiceFieldName: string
  practiceFieldLat: number      // decimal degrees
  practiceFieldLon: number      // decimal degrees
  // player proximity stored at scoring time:
  playerLat: number
  playerLon: number
  distanceMiles: number         // road-network distance, not straight-line
}
```

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

---

## Geocoding — Current State & Future Path

### Current (CLI pipeline)

`import-2026.ts` automatically spawns `geocode-players.ts` as a detached background process after import completes. The coordinator does not need to run geocoding separately — it fires and runs independently using the US Census batch API (free, no key, 1000 addresses/request). Geocoding is idempotent: re-running skips already-geocoded players.

**Geocoding must complete before `generate-report.ts` is run**, because proximity-to-field scoring requires player lat/lng. Check progress by watching the background process output or re-running `geocode-players.ts` (it will report "All players already geocoded" when done).

### Future (admin CSV upload via web UI)

When import moves to a web-based admin CSV upload endpoint, geocoding cannot fire-and-forget the same way because Amplify SSR Lambdas kill execution after the response returns. The correct architecture:

1. **API route** (`POST /api/admin/import-players`) parses the CSV, saves players/registrations to DynamoDB, sets a `geocoding_status: 'pending'` field on the import record, and returns **202 Accepted** immediately.
2. **Async worker** — one of:
   - An **SQS message** dropped at import time → a dedicated Lambda consumer runs geocoding in batches (fits the target architecture already designed — see `egs-se-registrations` and SQS in the architecture section)
   - A **scheduled Lambda** that polls for `geocoding_status = pending` records every few minutes and processes them
3. **Admin UI** polls or subscribes to the import record's `geocoding_status` field and shows a progress indicator (`pending → in-progress → complete`).
4. The matching/scoring engine must gate on `geocoding_status = complete` before running — surface an error in the admin dashboard if a player is missing coordinates at score time.

**Design rule:** geocoding is always a prerequisite for proximity scoring. Never run the assignment engine against a player whose `lat/lng` is null — skip them and flag as an exception requiring coordinator review.

---

## Matching Engine — Current State (as of 2026-04-05)

SQLite has been fully retired. DynamoDB is the single source of truth. The matching pipeline is entirely web-driven via the admin panel at `/admin/matching`.

### DynamoDB Tables — Matching

| Table | Key | Purpose | Status |
| --- | --- | --- | --- |
| `egs-players` | `player_id` + `season` | Player registrations + AI extraction fields + geocoded lat/lng | ✅ live |
| `egs-teams` | `team_id` + `season` | Teams per season — 157 teams imported for 2026 | ✅ live |
| `egs-assignments` | `player_id` + `season` | Historical and current assignment state — used for prev_team lookup and roster counts | ✅ live (2024 data) |
| `egs-matching-state` | `id = 'matching'` | Background job state — running/completed/failed, used by UI polling | ✅ live (handled gracefully if missing) |

### Player Record Fields (egs-players)

Registration fields from PlayMetrics CSV:
`player_id`, `player_first_name`, `player_last_name`, `birth_date`, `gender`, `package_name`, `season`, `special_request`, `school_and_grade`, `new_or_returning`, `account_email`, `account_phone`, `address`, `city`, `state`, `zip`, `volunteer_head_coach`, `volunteer_assistant_coach`, `registered_on`, `status`

Enrichment fields written by the background pipeline:
`lat`, `lng` — geocoded via US Census batch API
`extraction_coaches[]`, `extraction_friends[]`, `extraction_siblings[]`, `extraction_teams[]` — AI-extracted from special_request
`extraction_school` — clean school name (AI-parsed from school_and_grade, or Augur distance guess)
`extraction_school_guessed` (bool) — true when school was guessed by distance, not parsed from parent input
`extraction_notes` — AI-generated one-sentence context note, surfaced on every recommendation card

### Team Record Fields (egs-teams)

`team_id`, `team_name`, `season`, `birth_year`, `gender` (Male/Female), `coach_last_name`

Team name format: `{birth_year}{G/B} {nickname} ({coach_last_name})` e.g. `2016G Lightning (Torres)`
Team ID format: `2026-{slug}` e.g. `2026-2016g-lightning-torres`

2026 teams were imported from the coach spreadsheet via `platform/dynamo/import-teams-2026.ts`.
Age groups present: 2007, 2010, 2012, 2013, 2014, 2015, 2016, 2017, 2018 — both Male and Female where applicable.
Total: 157 teams for season 2026.

### Background Pipeline — trigger-matching

Route: `POST /api/admin/trigger-matching` — fire-and-forget, does not block the HTTP response.
State is polled by the UI every 5 seconds via `GET /api/admin/trigger-matching`.

**Pipeline steps in order:**

1. **Load 2026 players** from `egs-players`
2. **Geocode** players missing lat/lng — US Census batch geocoder (free, no key, 1000/batch)
3. **School guess (Augur)** — for players whose `school_and_grade` is nonsense (just a number, grade-only, blank): query EGUSD ArcGIS public layer, find nearest school of the right type (elem/middle/high) based on birth_date + lat/lng. Stored with `extraction_school_guessed = true`. Clear coordinator warning appended to recommendation.
4. **Load previous season (2025) players** — builds lookup by `account_email|birth_date` → previous `special_request` for history context
5. **AI extraction** (Claude Haiku) — runs on every player without `extraction_coaches`. Sends: player name, current special_request, previous season request (if found), school_and_grade field, new_or_returning. Returns structured `coaches[]`, `friends[]`, `siblings[]`, `teams[]`, `school_name`, `notes`. Stored back to DynamoDB.

### External Web Services

All third-party APIs and external data sources used by the app and matching pipeline.

| Service | URL | Auth | Used for |
| --- | --- | --- | --- |
| **Anthropic Claude API** | `https://api.anthropic.com` | `ANTHROPIC_API_KEY` env var | AI extraction of special requests (model: claude-haiku-4-5-20251001) |
| **US Census Geocoder** | `https://geocoding.geo.census.gov/geocoder/locations/addressbatch` | None (free, no key) | Batch geocoding player addresses → lat/lng, 1000 addresses per request |
| **Open-Meteo Weather API** | `https://api.open-meteo.com/v1/forecast` | None (free, no key) | Current weather conditions for Elk Grove and surrounding cities, 15-min revalidation |
| **EGUSD ArcGIS — Schools** | `https://webmaps.elkgrove.gov/arcgis/rest/services/OPEN_DATA_PORTAL/EGUSD_Schools/MapServer/0/query` | None (public) | School name and location lookup for Augur school distance guessing |
| **Resend Email API** | `https://api.resend.com` | `RESEND_API_KEY` env var | Contact form email forwarding; future parent assignment confirmation emails |
| **Cloudflare Turnstile** | `https://challenges.cloudflare.com/turnstile/v0/siteverify` | `TURNSTILE_SECRET_KEY` env var | Bot/spam protection on the public contact form |
| **Google Maps Embed** | `https://www.google.com/maps?q=ADDRESS&output=embed` | None (embed, no key) | Field location maps on the Maps page |
| **Google Sheets CSV** | `https://docs.google.com/spreadsheets/d/16bRzFp0IghrxTgSmLwrPymM9goh8fx5kXadiRTlXhaI/export?format=csv&gid=1891176485` | None (public sheet) | Live game schedule — fetched every 60 seconds |

### AI Data Sources — What Augur Receives and From Where

Every source of information fed into AI extraction and scoring, listed with where it comes from and what it produces.

| Data | Source | Where it lives | Used for |
| --- | --- | --- | --- |
| `special_request` (current season) | Parent free-text on registration form | `egs-players.special_request` | Primary input to AI extraction — coaches, friends, siblings, teams, notes |
| `special_request` (previous season) | Prior year registration, matched by `account_email + birth_date` | `egs-players` season N-1 | Sent to AI as `prev_special_request` — fills gaps when current request is blank or vague |
| `school_and_grade` | Parent free-text on registration form | `egs-players.school_and_grade` | AI parses into clean `extraction_school`; fallback to Augur distance guess when input is nonsense |
| `new_or_returning` | Registration form dropdown | `egs-players.new_or_returning` | Sent to AI for context; used in recommend() to adjust tone for new players |
| `birth_date` | Registration form | `egs-players.birth_date` | Calculates grade level for school type lookup; age group validation; play-up detection |
| `lat` / `lng` | US Census batch geocoder (run during pipeline) | `egs-players.lat`, `.lng` | Haversine proximity scoring (+1 within 5km of 2+ teammates); Augur school distance guess |
| `address`, `city`, `state`, `zip` | Registration form | `egs-players.*` | Input to Census geocoder |
| `account_email` | Registration form | `egs-players.account_email` | Automatic sibling detection (same email = same family); prev season request lookup |
| Previous assignments | Historical coordinator decisions | `egs-assignments` (all seasons) | `prev_team` signal — returning player bonus (+3), friend match anchor, multi-year history |
| Team coach names | Coach spreadsheet (imported manually) | `egs-teams.coach_last_name` | Matched against `extraction_coaches[]` to score coach requests |
| EGUSD school locations | Public ArcGIS layer (88 schools, WGS84 polygons) | https://webmaps.elkgrove.gov/arcgis/rest/services/OPEN_DATA_PORTAL/EGUSD_Schools/MapServer/0/query | Augur school guess when parent input is nonsense — nearest school of right type by distance |
| Roster counts | `egs-assignments` current season, `assignment_status = 'rostered'` | `egs-assignments` | Capacity warnings — preferred max and hard max per EGS Playing Rules |
| EGS Playing Rules | Official league rules PDF | Hardcoded in `teamCapacity()` in `matching-engine.ts` | Capacity limits by age group (U8: 10/12, U9-10: 12/14, U11-12: 16/18, U13-19: 18/22) |

**What AI (Claude Haiku) specifically receives per player call:**

```
Player: {first_name} {last_name}
New or returning: {new_or_returning}
School/grade field: "{school_and_grade}"
Current special request: "{special_request}"
Previous season request: "{prev_special_request}"   ← only if found
```

**What AI returns:**

```json
{
  "coaches":     ["last name or full name"],
  "friends":     ["teammate names (not family)"],
  "siblings":    ["names mentioned as brother/sister/sibling"],
  "teams":       ["team nicknames"],
  "school_name": "Clean School Name",
  "notes":       "One sentence of important context, or empty string"
}
```

**AI fallback rule:** If `extraction_coaches` field exists on the player record (even as an empty array), the scoring engine uses AI fields exclusively. If it is absent (AI hasn't run yet), all scoring falls back to raw text fuzzy matching on `special_request`. The page is fully functional before AI extraction runs.

### Scoring Engine — lib/matching-engine.ts

`runScoring(season)` is called on every page load — no pre-computed results stored. Always reads live DynamoDB.

**Score signals (per player × team):**

| Signal | Points | Source |
| --- | --- | --- |
| Returning to same team | +3 | prev_team from egs-assignments |
| Requested coach (current season) | +3 | extraction_coaches[] or raw text fallback |
| Requested coach (prev season coach, same team name) | +3 | prevTeams lookup |
| Requested team nickname | +2 | extraction_teams[] or raw text fallback |
| One-way friend request | +2 | extraction_friends[] or raw text fallback |
| Mutual friend request | +4 | both players list each other |
| Sibling (same account email, prev team) | +2 | account_email match |
| Named sibling request, prev team match | +5 | extraction_siblings[] or regex fallback |
| Named sibling request, same age group | +2 | extraction_siblings[] or regex fallback |
| Same school as prev teammate | +1 | extraction_school or school_and_grade words |
| Proximity (within 5km of 2+ teammates) | +1 | Haversine from lat/lng |

**Capacity signals (do not affect score — shown as warnings):**

| Condition | Warning level |
| --- | --- |
| Roster at/over hard max | Red — blocks placement, coordinator must approve |
| Roster at/over preferred max | Yellow — Augur note appended, coordinator may go +1-2 per rules |

**AI fallback rule:** When `extraction_coaches` exists (array, even if empty), scoring uses AI fields exclusively. When it is undefined/null (AI hasn't run yet), scoring falls back to raw text fuzzy matching on `special_request`. The page works before AI extraction has run.

### Roster Capacity Limits (from EGS Playing Rules PDF)

| Age Group | U-Age | Preferred Max | Hard Max |
| --- | --- | --- | --- |
| Future Stars | U8 and below | 10 | 12 |
| U9-U10 | U9, U10 | 12 | 14 |
| U11-U12 | U11, U12 | 16 | 18 |
| U13-U19 | U13–U19 | 18 | 22 |

U-age is derived from birth_year at runtime: `(season_year + 1) - birth_year`. No hardcoded birth years — works across seasons automatically.
Roster counts come from `egs-assignments` records with `assignment_status = 'rostered'` for the current season.

### Sibling Matching Rules

- **Same age group:** Scored +5 (prev team match) or +2 (same age group). Recommendation: green "place together."
- **Different age group (cross-age):** No score points. Recommendation: red. Message: "One player must PLAY UP — only play-ups are allowed, no play-downs. Coordinator must decide which player moves up."
- **Detection:** AI `siblings[]` field preferred. Fallback: regex on `"Player- Name (brother/sister)"` pattern.
- **Play-up rule:** Only playing up is allowed. Playing down is never permitted.

### Play-Down Policy (Critical Rule)

**There are no play-downs at Elk Grove Soccer.**

A player may never be assigned to a team in a younger age group than their own birth year. Play-ups (assigning a younger player to an older age group) are allowed and occur regularly. Play-downs are prohibited by club policy and must never be suggested or auto-assigned by the engine.

**Exceptions:** Play-downs can occur in extreme, rare circumstances (e.g., a medical or developmental situation) but only as an explicit coordinator override — never as an AI suggestion. The engine must never recommend a play-down. If a coordinator applies one manually, it should be flagged in the UI as an override requiring acknowledgment.

### School Lookup — EGUSD ArcGIS

Public endpoint: `https://webmaps.elkgrove.gov/arcgis/rest/services/OPEN_DATA_PORTAL/EGUSD_Schools/MapServer/0/query`

- 88 school records with polygon boundaries in WGS84
- Centroid calculated by averaging polygon ring coordinates
- School type values: ELEMENTARY, MIDDLE, HIGH, KTHRU8, PKTHRU8, KTHRU12, MIDDLE/HIGH, PRESCHOOL, PKTHRUK, PKTHRU9
- Grade → school type mapping uses California Sept 1 cutoff for age calculation
- Used only as fallback when `school_and_grade` is nonsense input
- School cache is held in memory per pipeline run (one fetch for all players)

### Augur — AI Persona for Coordinator Warnings

The system identifies itself as **Augur** when surfacing guesses or uncertain recommendations:
- School distance guesses: `"Augur guessed school as X based on address distance — coordinator should verify"`
- Score reasons label guessed school: `"Same school (Augur guess) as N teammate(s)"`
- Near-capacity warnings: `"⚠️ Augur: Roster near limit: 12/12 preferred (14 max)..."`

This distinguishes machine guesses from hard facts so coordinators know what to verify.

### Recommendation Levels

| Level | Color | Meaning |
| --- | --- | --- |
| green | ✅ | High confidence — assign with no further review |
| yellow | ⚠️ | Good match but coordinator should verify one thing |
| orange | 🟠 | Weak signals — manual review recommended |
| red | ❌ | Blocked — capacity full, play-up conflict, or unresolvable request |

### Admin UI — /admin/matching

- Packages grouped by age group (e.g. "2017 Boys", "U10 Girls")
- Per player: name, birth date, assigned team (top suggestion), score, reasons list, recommendation text + level
- UI auto-refreshes every 5 seconds while pipeline is running
- "Generate Recommendations" button triggers background pipeline, shows running state
- No SSE / streaming — fire-and-forget POST + polling GET

### Data Import Scripts (platform/dynamo/)

| Script | Purpose |
| --- | --- |
| `import-teams-2026.ts` | Hardcoded 157 teams from coach spreadsheet — run once to seed 2026 teams |
| `clone-teams-2026.ts` | Clones 2025 teams into 2026 as placeholders — superseded by import-teams-2026.ts |

Run with: `DYNAMO_ACCESS_KEY_ID=... DYNAMO_SECRET_ACCESS_KEY=... npx tsx platform/dynamo/<script>.ts`
Do NOT use default AWS CLI credentials — the app uses a separate IAM user (`DYNAMO_ACCESS_KEY_ID` in `.env.local`).

### Build Order — Remaining Work

1. ✅ `egs-teams` seeded for 2026
2. ✅ Geocoding pipeline live
3. ✅ AI extraction pipeline live (school, siblings, history, notes)
4. ✅ Scoring engine live with all signals
5. ✅ Roster capacity warnings live
6. ✅ Augur school distance guessing live
7. 🔲 `volunteer_head_coach` / `volunteer_assistant_coach` fields used for scoring (parent coaching their own kid → near-certain team match)
8. 🔲 `egs-assignments` write — coordinator accepts suggestion → writes to DynamoDB
9. 🔲 Parent confirmation email (Resend) on assignment
10. 🔲 PlayMetrics webhook or polling trigger for real-time auto-assignment

---

## Product Vision & Commercialization Strategy

*(Documented 2026-04-07 — strategic discussion summary)*

### What's Missing / Functional Gaps to Build

**Coordinator workflows:**
- No bulk-approve/reject flow before emails go out — assignments are fire-and-forget today
- No coach portal — coaches can't see their own roster or confirm receipt
- No waitlist management — no flow for when a team fills mid-season and new registrations arrive
- No conflict resolution UI for competing "together" requests across packages
- No undo/rollback for grand assignment runs
- No audit trail UI showing why a coordinator override was made

**Parent-facing gaps:**
- No self-service portal — parents can only receive an email, can't check status, update preferences, or confirm receipt
- No opt-out or preference update flow post-registration
- No coach contact info delivered to parents post-assignment

**Operations:**
- Season hardcoded as '2026' across multiple files — needs a season setup wizard
- No registration import pipeline (GoMotion/Demosphere CSV or API)
- No scheduler for automatic email sends after coordinator approval

---

### Innovative Differentiators

Things that make this product genuinely different from SportsConnect, TeamSnap, GotSoccer:

1. **AI school clustering** — no competitor automatically infers school from free-text and clusters teammates. Novel for rec soccer.
2. **Confidence scoring with explainability** — coordinators see *why* a match was made at the signal level, not just who was assigned.
3. **Coordinator Chat** — natural language queries over live season data. No competitor has this.
4. **Global greedy assignment engine** — competitors are first-come-first-served or fully manual. Globally optimal assignment is a real differentiator.

---

### Monetization Model

**Target buyers:**
- Recreational soccer leagues (primary)
- Expansion sports: baseball, basketball, volleyball — same coordinator pain
- Regional league management companies running multiple orgs

**Pricing models to evaluate:**
- Per-season per-player ($0.50–$1.00/player) — scales with value delivered
- Flat SaaS per league per season ($500–$2,000/season) — simpler to sell
- Tiered by feature — assignment engine as base, AI chat + email automation as premium

**Elk Grove Soccer deal:** Perpetual free license in exchange for being the development partner and case study that enables the product to be sold to others.

**Competitive moat:** AI chat + explainability stack is hard to replicate quickly. School inference saves coordinators hours of phone calls — lead with this in sales conversations.

**Pre-sales requirement:** Get 2–3 more leagues on a free pilot to validate product-market fit before writing multi-tenant infrastructure. Pricing model depends on whether buyers are small rec leagues ($300/season budget) or regional associations ($5K+ budget) — these are different products.

---

### Multi-Tenancy & PII Architecture (Future)

**Open questions that must be answered before building:**

1. **Isolation model** — database-per-tenant (strongest, most expensive), separate DynamoDB table prefixes per org (middle ground), or row-level tenant isolation (cheapest, highest risk). Given children's data, database-per-tenant or table-prefix isolation is strongly preferred.
2. **Data ownership** — does the league own the data or do the parents? Drives retention, deletion, and export obligations.
3. **COPPA** — players under 13 put this in federal compliance territory. Determine if the league handles this or if the platform must.
4. **Data residency** — international customers trigger GDPR. Decide before architecture is locked.
5. **Authentication** — current single admin password must become org-scoped auth (Cognito or Auth0) with roles: superadmin, league admin, coordinator, coach, parent.
6. **AI data handling disclosure** — player names and school data are sent to Anthropic's API. Terms of service must disclose this; Anthropic's data processing terms must be reviewed for PII acceptability.

---

### Team Cloning + Unrostering Rule (Critical)

When teams are cloned from a prior season as placeholders:
- Coaches on placeholder teams may not return for the new season
- When actual team data arrives, diff against placeholders
- Any player pre-assigned to a team that no longer exists OR whose coach changed → mark unrostered
- Unrostered players auto-queued for re-scoring — never silently dropped
- New age groups with no prior season equivalent skip cloning entirely
