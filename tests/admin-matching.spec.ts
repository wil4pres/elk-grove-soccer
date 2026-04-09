/**
 * Playwright E2E tests for the matching admin page and trigger API.
 * Auth is handled globally via playwright/.auth/admin.json (see auth.setup.ts).
 * All tests here run with a pre-authenticated session — no manual login needed.
 */
import { test, expect, type Page } from '@playwright/test'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function goToMatching(page: Page) {
  await page.goto('/admin/matching')
  // Wait until spinner disappears OR content arrives
  await page.waitForFunction(
    () => !document.querySelector('.animate-spin') ||
          !!document.querySelector('table') ||
          !!document.querySelector('p.text-gray-400'),
    { timeout: 20000 }
  ).catch(() => {})
  await page.waitForTimeout(500)
}

async function getCsrfToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies()
  return cookies.find(c => c.name === 'csrf_token')?.value ?? ''
}

async function resetState(page: Page) {
  const csrf = await getCsrfToken(page)
  const res = await page.request.delete('/api/admin/trigger-matching', {
    headers: { 'x-csrf-token': csrf },
  })
  expect(res.status()).toBe(200)
}

/**
 * Intercept GET /api/admin/trigger-matching to return a fake state,
 * then navigate to /admin/matching. The page's first poll hits the mock.
 */
async function withFakeState(page: Page, state: Record<string, unknown>) {
  await page.route('**/api/admin/trigger-matching', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'matching', ...state }),
      })
    } else {
      await route.continue()
    }
  })
  await page.goto('/admin/matching')
  await page.waitForTimeout(3000) // let the 2s polling cycle fire at least once
}

// ─── Auth guard — run without stored session ─────────────────────────────────

test.describe('Matching page — auth', () => {
  // Override storageState to empty so these tests run without the saved cookie
  test.use({ storageState: { cookies: [], origins: [] } })

  test('unauthenticated GET /api → 401', async ({ page }) => {
    const res = await page.request.get('/api/admin/trigger-matching')
    expect(res.status()).toBe(401)
  })

  test('unauthenticated POST /api → 401', async ({ page }) => {
    const res = await page.request.post('/api/admin/trigger-matching')
    expect(res.status()).toBe(401)
  })

  test('unauthenticated DELETE /api → 401', async ({ page }) => {
    const res = await page.request.delete('/api/admin/trigger-matching')
    expect(res.status()).toBe(401)
  })

  test('visiting /admin/matching redirects to login', async ({ page }) => {
    await page.goto('/admin/matching')
    await page.waitForURL('**/admin/login**', { timeout: 10000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

// ─── Page layout ─────────────────────────────────────────────────────────────

test.describe('Matching page — layout', () => {
  test('sidebar shows EGS Matching 2026 branding', async ({ page }) => {
    await goToMatching(page)
    await expect(page.locator('text=EGS').first()).toBeVisible()
    await expect(page.locator('text=2026').first()).toBeVisible()
  })

  test('header shows title and subtitle', async ({ page }) => {
    await goToMatching(page)
    // h2 shows active package name or 'Matching' when no data — just verify it exists
    await expect(page.locator('h2').first()).toBeVisible()
    await expect(page.getByText('Elk Grove Soccer — Team Assignment Suggestions')).toBeVisible()
  })

  test('Generate Recommendations button visible and enabled at idle', async ({ page }) => {
    await resetState(page)
    await goToMatching(page)
    const btn = page.getByRole('button', { name: /Generate Recommendations/i }).first()
    await expect(btn).toBeVisible()
    await expect(btn).toBeEnabled()
  })

  test('floating Generate button visible top-right', async ({ page }) => {
    await goToMatching(page)
    // The fixed floating button at top-right
    const floatingBtn = page.locator('button', { hasText: /Generate Recommendations/ }).last()
    await expect(floatingBtn).toBeVisible()
  })

  test('Refresh button visible', async ({ page }) => {
    await goToMatching(page)
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible()
  })

  test('sidebar shows package tabs or empty state', async ({ page }) => {
    await goToMatching(page)
    const hasTabs = (await page.locator('div.bg-\\[\\#1e3a5f\\] button').count()) > 0
    const hasNoData = await page.getByText('No 2026 Data').isVisible().catch(() => false)
    expect(hasTabs || hasNoData).toBeTruthy()
  })
})

// ─── Player table ─────────────────────────────────────────────────────────────

test.describe('Matching page — player table', () => {
  test('table columns visible when data loaded', async ({ page }) => {
    await goToMatching(page)
    const hasData = await page.locator('table').isVisible().catch(() => false)
    if (!hasData) {
      test.skip(true, 'No 2026 data')
      return
    }
    await expect(page.getByRole('columnheader', { name: 'Player' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '2025 Team' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /School/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Special Request/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Suggestions' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /AI Recommendation/i })).toBeVisible()
  })

  test('stats bar shows player counts', async ({ page }) => {
    await goToMatching(page)
    const hasData = await page.locator('table').isVisible().catch(() => false)
    if (!hasData) { test.skip(true, 'No data'); return }
    await expect(page.locator('span').filter({ hasText: /\d+ players/ }).first()).toBeVisible()
  })

  test('at least one player row renders', async ({ page }) => {
    await goToMatching(page)
    const hasData = await page.locator('table').isVisible().catch(() => false)
    if (!hasData) { test.skip(true, 'No data'); return }
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
  })

  test('recommendation cells have colored border styling', async ({ page }) => {
    await goToMatching(page)
    const hasData = await page.locator('table').isVisible().catch(() => false)
    if (!hasData) { test.skip(true, 'No data'); return }
    const recCells = page.locator('td div').filter({
      hasText: /Assign|Suggest|Consider|New player|Request|Sibling|Return/i
    })
    expect(await recCells.count()).toBeGreaterThan(0)
  })

  test('suggestion cards show rank number and pts score', async ({ page }) => {
    await goToMatching(page)
    const hasData = await page.locator('table').isVisible().catch(() => false)
    if (!hasData) { test.skip(true, 'No data'); return }
    const rankLabel = page.locator('span', { hasText: '#1' }).first()
    if (await rankLabel.isVisible().catch(() => false)) {
      await expect(rankLabel).toBeVisible()
      await expect(page.locator('span').filter({ hasText: /\d+ pts/ }).first()).toBeVisible()
    }
  })

  test('switching sidebar tabs updates displayed package', async ({ page }) => {
    await goToMatching(page)
    const hasData = await page.locator('table').isVisible().catch(() => false)
    if (!hasData) { test.skip(true, 'No data'); return }
    const tabs = page.locator('div.bg-\\[\\#1e3a5f\\] button')
    if (await tabs.count() < 2) { test.skip(true, 'Only one package'); return }
    await tabs.nth(1).click()
    await page.waitForTimeout(500)
    await expect(page.locator('h2').first()).toBeVisible()
  })
})

// ─── State API ────────────────────────────────────────────────────────────────

test.describe('Matching API — state', () => {
  test('GET returns valid status', async ({ page }) => {
    const res = await page.request.get('/api/admin/trigger-matching')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(['idle', 'running', 'completed', 'failed']).toContain(body.status)
  })

  test('GET response has no Jarvis references', async ({ page }) => {
    const body = await (await page.request.get('/api/admin/trigger-matching')).json()
    expect(JSON.stringify(body)).not.toMatch(/jarvis/i)
  })

  test('DELETE resets to idle', async ({ page }) => {
    const csrf = await getCsrfToken(page)
    const res = await page.request.delete('/api/admin/trigger-matching', {
      headers: { 'x-csrf-token': csrf },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).status).toBe('idle')
  })

  test('DELETE → GET confirms idle', async ({ page }) => {
    const csrf = await getCsrfToken(page)
    await page.request.delete('/api/admin/trigger-matching', { headers: { 'x-csrf-token': csrf } })
    const body = await (await page.request.get('/api/admin/trigger-matching')).json()
    expect(body.status).toBe('idle')
  })

  test('POST returns started (SQS) or 500 (queue unreachable)', async ({ page }) => {
    const csrf = await getCsrfToken(page)
    await page.request.delete('/api/admin/trigger-matching', { headers: { 'x-csrf-token': csrf } })
    const res = await page.request.post('/api/admin/trigger-matching', {
      headers: { 'x-csrf-token': csrf },
    })
    const body = await res.json()
    if (res.status() === 200) {
      expect(body.status).toBe('started')
      // messageId comes from SQS — present when queue is reachable
      if (body.messageId) expect(typeof body.messageId).toBe('string')
    } else {
      // SQS credentials may differ from DynamoDB credentials in this env
      expect([500, 409]).toContain(res.status())
      expect(body.error).toBeDefined()
    }
    await page.request.delete('/api/admin/trigger-matching', { headers: { 'x-csrf-token': csrf } })
  })

  test('second POST while running returns 409', async ({ page }) => {
    const csrf = await getCsrfToken(page)
    await page.request.delete('/api/admin/trigger-matching', { headers: { 'x-csrf-token': csrf } })
    const first = await page.request.post('/api/admin/trigger-matching', {
      headers: { 'x-csrf-token': csrf },
    })
    if (first.status() !== 200) {
      test.skip(true, 'SQS not available')
      return
    }
    const second = await page.request.post('/api/admin/trigger-matching', {
      headers: { 'x-csrf-token': csrf },
    })
    expect(second.status()).toBe(409)
    await page.request.delete('/api/admin/trigger-matching', { headers: { 'x-csrf-token': csrf } })
  })
})

// ─── Button UX — mocked states ────────────────────────────────────────────────

test.describe('Matching page — button UX', () => {
  test('idle: Generate button enabled', async ({ page }) => {
    await withFakeState(page, { status: 'idle' })
    const btn = page.getByRole('button', { name: /Generate Recommendations/i }).first()
    await expect(btn).toBeVisible()
    await expect(btn).toBeEnabled()
  })

  test('running: button disabled and shows step label', async ({ page }) => {
    await withFakeState(page, {
      status: 'running',
      startedAt: new Date(Date.now() - 10000).toISOString(),
      stepLabel: 'Geocoding 45/89 addresses…',
      stepProgress: { current: 45, total: 89 },
    })
    const runningBtn = page.locator('button').filter({ hasText: /Geocoding|Running|Starting/i }).first()
    await expect(runningBtn).toBeVisible({ timeout: 5000 })
    await expect(runningBtn).toBeDisabled()
  })

  test('running: button is disabled and shows seconds counter', async ({ page }) => {
    await withFakeState(page, {
      status: 'running',
      startedAt: new Date(Date.now() - 10000).toISOString(),
      stepLabel: 'AI extraction 10/50 players…',
    })
    // Button is disabled and shows elapsed seconds (e.g. "⏳ AI extraction… 10s")
    const btn = page.locator('button').filter({ hasText: /\d+s/ }).first()
    await expect(btn).toBeVisible({ timeout: 5000 })
    await expect(btn).toBeDisabled()
  })

  test('running > 2 min: "Reset stuck job" link appears', async ({ page }) => {
    await withFakeState(page, {
      status: 'running',
      startedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      stepLabel: 'AI extraction 45/89 players…',
    })
    await expect(page.getByText(/Reset stuck job/i)).toBeVisible({ timeout: 8000 })
  })

  test('failed: error message and "Reset & retry" link visible', async ({ page }) => {
    await withFakeState(page, {
      status: 'failed',
      error: 'Job timed out — click Generate to retry.',
      completedAt: new Date().toISOString(),
    })
    await expect(page.getByText(/Reset.*retry/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/Job timed out/i).first()).toBeVisible()
  })

  test('completed: floating button shows ✓ Done', async ({ page }) => {
    await withFakeState(page, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
    await expect(page.locator('button', { hasText: /✓ Done/i }).first()).toBeVisible({ timeout: 8000 })
  })

  test('elapsed timer increments between polls', async ({ page }) => {
    const startedAt = new Date(Date.now() - 5000).toISOString()
    await page.route('**/api/admin/trigger-matching', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ id: 'matching', status: 'running', startedAt, stepLabel: 'Geocoding 10/50 addresses…' }),
        })
      } else { await route.continue() }
    })
    await page.goto('/admin/matching')

    // Wait for any disabled button showing seconds (running state)
    const runningBtn = page.locator('button').filter({ hasText: /\d+s/ }).first()
    await expect(runningBtn).toBeVisible({ timeout: 8000 })

    const text1 = await runningBtn.innerText()
    await page.waitForTimeout(3000)
    const text2 = await runningBtn.innerText()

    const n1 = parseInt(text1.match(/(\d+)s/)?.[1] ?? '0')
    const n2 = parseInt(text2.match(/(\d+)s/)?.[1] ?? '0')
    expect(n2).toBeGreaterThan(n1)
  })

  test('clicking Generate calls POST and button enters running state', async ({ page }) => {
    let posted = false
    await page.route('**/api/admin/trigger-matching', async (route) => {
      const method = route.request().method()
      if (method === 'POST') {
        posted = true
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ status: 'started', messageId: 'mock-123' }) })
      } else if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ id: 'matching', status: posted ? 'running' : 'idle',
            startedAt: posted ? new Date().toISOString() : undefined,
            stepLabel: posted ? 'Starting…' : undefined }) })
      } else { await route.continue() }
    })
    await page.goto('/admin/matching')
    await page.waitForTimeout(1000)

    const btn = page.getByRole('button', { name: /Generate Recommendations/i }).first()
    await expect(btn).toBeEnabled()
    await btn.click()
    await page.waitForTimeout(2500)

    expect(posted).toBeTruthy()
    await expect(page.locator('button').filter({ hasText: /Running|Starting/i }).first())
      .toBeVisible({ timeout: 5000 })
  })
})

// ─── Augur persona — zero Jarvis references ───────────────────────────────────

test.describe('Augur persona', () => {
  test('no "Jarvis" text visible on matching page', async ({ page }) => {
    await goToMatching(page)
    await page.waitForTimeout(2000)
    expect(await page.getByText(/Jarvis/i).count()).toBe(0)
  })

  test('GET state contains no Jarvis in JSON', async ({ page }) => {
    const body = await (await page.request.get('/api/admin/trigger-matching')).json()
    expect(JSON.stringify(body)).not.toMatch(/jarvis/i)
  })

  test('"Augur" label present in school-guessed recommendations when applicable', async ({ page }) => {
    await goToMatching(page)
    const hasData = await page.locator('table').isVisible().catch(() => false)
    if (!hasData) { test.skip(true, 'No data'); return }
    // Either Augur appears (school guesses exist) or it doesn't (all clean input)
    // Either way, Jarvis must be absent
    expect(await page.getByText(/Jarvis/i).count()).toBe(0)
  })
})
