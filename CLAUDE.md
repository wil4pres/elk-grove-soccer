# Elk Grove Soccer — AI Handoff Reference

Live site: **https://sacramento.soccer**
Repository: **https://github.com/wil4pres/elk-grove-soccer**
Amplify App ID: **d1gz6r6mjgacrf**
AWS Account: **532180544564** | CLI Profile: **elkgrovesoccer**

---

## Project Goals

This is the official website for **Elk Grove Soccer (EGS)**, a NorCal Premier youth soccer club based in Sacramento, CA. The site serves families, coaches, and club staff.

**Primary goals:**
1. Give parents a fast, mobile-first game-day companion — field status, directions, schedule, weather
2. Help families discover and register for the right program (Future Stars → Academy)
3. Let staff manage field status, programs, sponsors, and rosters without touching code
4. Build trust and community through staff profiles, alumni stories, and sponsor recognition
5. Be installable as a PWA on iOS and Android for sideline use

**Current season:** Spring 2026

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
| Database | AWS DynamoDB |
| Auth | JWT (jose) — password-only admin auth |
| Schedule data | Google Sheets CSV export |
| Hosting | AWS Amplify (SSR) |
| Domain | sacramento.soccer (www + apex via Amplify) |
| Testing | Playwright (tests against live production) |

### Key Architecture Rules
- **Server components by default.** Use `'use client'` only for interactive UI (filters, forms, menus).
- **`export const dynamic = 'force-dynamic'`** on any page that reads live data (fields, schedule, programs). This bypasses CloudFront's static cache.
- **Never use module-level `await`** for AWS SDK calls — Amplify SSR Lambda cold-starts will fail. Use dynamic `import()` inside functions (see `lib/secrets.ts`).
- **No API key for Google Maps embeds** — use `https://www.google.com/maps?q=ADDRESS&output=embed` iframe pattern.

---

## File Map

```
elk-grove-soccer/
├── app/
│   ├── layout.tsx              # Root layout — SiteHeader + SiteFooter + PWA script
│   ├── globals.css             # Tailwind 4 @theme tokens, global utilities
│   ├── page.tsx                # Home page — hero + game day cards (live schedule + fields)
│   ├── programs/page.tsx       # Programs page — finder quiz + level sections + program cards
│   ├── register/page.tsx       # Registration page — program cards + FAQ
│   ├── field-status/page.tsx   # Field status page — live DynamoDB data
│   ├── maps/page.tsx           # Maps page — Google Maps embeds + live schedule filter
│   ├── staff/page.tsx          # Staff/coordinators page — DynamoDB data
│   ├── admin/
│   │   ├── layout.tsx          # Admin layout — wraps all /admin/* routes (no site header)
│   │   ├── page.tsx            # Admin dashboard — links to all sections
│   │   ├── login/page.tsx      # Login page (client component — calls /api/admin/login)
│   │   ├── logout/route.ts     # GET handler — clears cookie, redirects to /admin/login
│   │   ├── fields/             # Field status CRUD
│   │   ├── programs/           # Programs CRUD
│   │   ├── sponsors/           # Sponsors CRUD
│   │   ├── alumni/             # Alumni CRUD
│   │   ├── staff/              # Staff CRUD
│   │   └── _components/        # Shared admin UI (AdminNav, ConfirmDelete, StatusButtons)
│   └── api/
│       ├── admin/login/route.ts # POST — validates password, sets JWT cookie (200 response)
│       ├── fields/             # REST endpoints for field data
│       ├── programs/           # REST endpoints for program data
│       ├── sponsors/           # REST endpoints
│       ├── alumni/             # REST endpoints
│       ├── staff/              # REST endpoints
│       └── health/             # GET /api/health — returns ok
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
├── middleware.ts               # Protects /admin/* — redirects to /admin/login if no valid JWT
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   ├── favicon.svg             # TODO: redesign — currently not a clear soccer ball
│   └── icons/                  # PWA icons (icon-192.png, icon-512.png)
├── tests/
│   └── site.spec.ts            # 39 Playwright tests — run against live production
├── playwright.config.ts        # baseURL: https://sacramento.soccer
└── next.config.ts
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

### Live Schedule — Google Sheets CSV
- Sheet ID: `16bRzFp0IghrxTgSmLwrPymM9goh8fx5kXadiRTlXhaI`
- GID: `1891176485`
- CSV URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}`
- Revalidates every **60 seconds** via `{ next: { revalidate: 60 } }`
- Returns `null` if sheet is unreachable → UI shows "Pending Schedule Soon"
- Returns `[]` if sheet reachable but no matches → UI shows "No Games Today" / "No Matches Scheduled"
- `filterCurrentAndFuture()` drops matches where kickoff + 1 hour is in the past (hides completed games)

### Auth Flow
1. User POSTs to `/api/admin/login` with `{ password }`
2. Server validates against `ADMIN_PASSWORD` env var, creates a JWT signed with `SESSION_SECRET`
3. JWT is set as `httpOnly; secure; sameSite=lax; path=/; maxAge=86400` cookie named `admin_session`
4. Middleware at `middleware.ts` intercepts all `/admin/*` (except `/admin/login`, `/admin/logout`), verifies JWT
5. Invalid/missing token → redirect to `/admin/login`
6. Tokens expiring within 30 min are automatically refreshed

**Why API route, not server action:** Amplify's CloudFront distribution stripped `Set-Cookie` headers from server action 303 redirects. Using a 200 response from an API route reliably delivers the cookie.

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
npx playwright test                    # run all 39 tests
npx playwright test --grep "Admin"     # run only admin tests
npx playwright test --headed           # open browser (debugging)
```

Test results saved to `test-results/`. Screenshots on failure only.

**Current test status (as of last run):** 38/39 passing. The one failing test ("admin fields page accessible when logged in") was caused by the server action cookie issue — fixed by switching to API route login. Re-run after latest deployment to confirm all 39 pass.

---

## Pages Not Yet Built

These routes are linked in nav/footer but return 404:

| Route | Description |
|-------|-------------|
| `/alumni` | Alumni success stories — data table `egs-alumni` exists |
| `/sponsors` | Sponsor showcase — data table `egs-sponsors` exists |
| `/contact` | Contact form / club info |
| `/volunteer` | Volunteer signup |
| `/about` | Club history and mission |

**Pattern to follow for new public pages:** copy the hero + card pattern from `app/field-status/page.tsx`. Always add `export const dynamic = 'force-dynamic'` if reading from DynamoDB.

---

## Known Issues / TODOs

1. **Favicon** — `public/favicon.svg` doesn't clearly resemble a soccer ball. Needs redesign.
2. **Programs data** — Currently uses `mockPrograms` from `lib/programs.ts` as fallback when DynamoDB returns empty. Real programs should be added via `/admin/programs`.
3. **Registration** — The Register page shows program cards but has no actual payment/enrollment integration. A link to an external registration platform (SportsEngine, etc.) is the expected solution.
4. **Weather widget** — Home page game day cards reference weather but show no real data. Could integrate a free weather API (Open-Meteo) keyed to Elk Grove coords.
5. **Alumni / Sponsors pages** — Tables exist, admin CRUD exists, public pages not built.
6. **Mobile app** — The site is PWA-installable. Full native app (React Native / Expo) would be a future project.
7. **Staff photos** — Staff profiles support `photoUrl` but many entries may have placeholder or empty values.

---

## Deployment

Push to `main` branch → Amplify auto-deploys (build + SSR). Build takes ~3 minutes.

```bash
git push origin main
# Check status:
aws amplify list-jobs --app-id d1gz6r6mjgacrf --branch-name main --profile elkgrovesoccer --max-results 1
```

No manual deploy steps needed. All env vars are set at the branch level in Amplify console.
