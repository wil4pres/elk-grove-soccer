/**
 * Playwright tests for the Season Walkthrough modal.
 *
 * The modal is driven entirely by localStorage (egs-walkthrough-seen-2026).
 * No backend data is created — cleanup is just clearing the storage key.
 */

import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'egs-walkthrough-seen-2026'

// Auth state is injected by playwright.config.ts (storageState) — no manual login needed.
async function goToDashboard(page: import('@playwright/test').Page) {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

async function clearWalkthrough(page: import('@playwright/test').Page) {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
}

async function markWalkthroughSeen(page: import('@playwright/test').Page) {
  await page.evaluate((key) => localStorage.setItem(key, '1'), STORAGE_KEY)
}

// ─── Test 1: Modal auto-shows for first-time visitors ────────────────────────

test('walkthrough: auto-shows on first visit', async ({ page }) => {
  await goToDashboard(page)
  await clearWalkthrough(page)
  await page.reload()

  const modal = page.locator('text=Welcome to the EGS Admin Panel')
  await expect(modal).toBeVisible({ timeout: 5000 })
  console.log('✅ Modal auto-shows on first visit')

  // Cleanup
  await markWalkthroughSeen(page)
})

// ─── Test 2: Full step-through — Next all the way to Done ───────────────────

test('walkthrough: step through all 6 steps and dismiss with Done', async ({ page }) => {
  await goToDashboard(page)
  await clearWalkthrough(page)
  await page.reload()

  // Step 1 — Welcome
  await expect(page.locator('text=Welcome to the EGS Admin Panel')).toBeVisible()
  await expect(page.getByText('Spring 2026 Season', { exact: true })).toBeVisible()
  console.log('✅ Step 1: Welcome')
  await page.getByRole('button', { name: 'Next' }).click()

  // Step 2 — Upload
  await expect(page.locator('text=Step 1 — Upload Player Data')).toBeVisible()
  await expect(page.locator('a', { hasText: 'Go to Data Uploads' })).toBeVisible()
  console.log('✅ Step 2: Upload Player Data')
  await page.getByRole('button', { name: 'Next' }).click()

  // Step 3 — Matching
  await expect(page.locator('text=Step 2 — Run Team Matching')).toBeVisible()
  await expect(page.locator('a', { hasText: 'Go to Team Matching' })).toBeVisible()
  console.log('✅ Step 3: Run Team Matching')
  await page.getByRole('button', { name: 'Next' }).click()

  // Step 4 — Assignments
  await expect(page.locator('text=Finalize Assignments')).toBeVisible()
  await expect(page.locator('a', { hasText: 'Go to Assignments' })).toBeVisible()
  console.log('✅ Step 4: Review & Finalize Assignments')
  await page.getByRole('button', { name: 'Next' }).click()

  // Step 5 — Emails
  await expect(page.locator('text=Step 4 — Send Parent Notifications')).toBeVisible()
  await expect(page.locator('a', { hasText: 'Go to Email Log' })).toBeVisible()
  console.log('✅ Step 5: Send Parent Notifications')
  await page.getByRole('button', { name: 'Next' }).click()

  // Step 6 — Done
  await expect(page.locator("text=You're all set!")).toBeVisible()
  await expect(page.locator('text=Ongoing management')).toBeVisible()
  console.log('✅ Step 6: All set')
  await page.getByRole('button', { name: 'Done' }).click()

  // Modal should be gone
  await expect(page.locator('text=Welcome to the EGS Admin Panel')).not.toBeVisible()
  console.log('✅ Modal dismissed after Done')

  // localStorage should be set
  const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  expect(stored).toBe('1')
  console.log('✅ localStorage key set — will not re-show')
})

// ─── Test 3: Skip closes modal and sets storage ──────────────────────────────

test('walkthrough: Skip dismisses immediately and sets storage', async ({ page }) => {
  await goToDashboard(page)
  await clearWalkthrough(page)
  await page.reload()

  await expect(page.locator('text=Welcome to the EGS Admin Panel')).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click()

  await expect(page.locator('text=Welcome to the EGS Admin Panel')).not.toBeVisible()
  const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  expect(stored).toBe('1')
  console.log('✅ Skip dismissed modal and set localStorage')
})

// ─── Test 4: Back navigation works ───────────────────────────────────────────

test('walkthrough: Back button returns to previous step', async ({ page }) => {
  await goToDashboard(page)
  await clearWalkthrough(page)
  await page.reload()

  await expect(page.locator('text=Welcome to the EGS Admin Panel')).toBeVisible()
  // Back should not be visible on step 1
  await expect(page.getByRole('button', { name: 'Back' })).not.toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('text=Step 1 — Upload Player Data')).toBeVisible()

  // Back should be visible now
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()

  await expect(page.locator('text=Welcome to the EGS Admin Panel')).toBeVisible()
  console.log('✅ Back navigation works correctly')

  // Cleanup
  await markWalkthroughSeen(page)
})

// ─── Test 5: Dot navigation jumps to step ────────────────────────────────────

test('walkthrough: dot navigation jumps between steps', async ({ page }) => {
  await goToDashboard(page)
  await clearWalkthrough(page)
  await page.reload()

  await expect(page.locator('text=Welcome to the EGS Admin Panel')).toBeVisible()

  // Click the 4th dot (0-indexed: dot 3 = Assignments step)
  // Dots are rendered as buttons inside the flex gap-1.5 container
  const dots = page.locator('div.flex.gap-1\\.5 button')
  await dots.nth(3).click()
  await expect(page.locator('text=Finalize Assignments')).toBeVisible()
  console.log('✅ Dot navigation jumps to correct step')

  // Cleanup
  await markWalkthroughSeen(page)
})

// ─── Test 6: Does NOT show again after seen ───────────────────────────────────

test('walkthrough: does not auto-show after dismissal', async ({ page }) => {
  await goToDashboard(page)
  await markWalkthroughSeen(page)
  await page.reload()

  await expect(page.locator('text=Welcome to the EGS Admin Panel')).not.toBeVisible({ timeout: 3000 })
  console.log('✅ Modal does not re-show after dismissal')
})

// ─── Test 7: "Season Walkthrough" button re-opens modal ──────────────────────

test('walkthrough: Season Walkthrough button re-opens modal', async ({ page }) => {
  await goToDashboard(page)
  await markWalkthroughSeen(page)
  await page.reload()

  // Modal should not be showing
  await expect(page.locator('text=Welcome to the EGS Admin Panel')).not.toBeVisible({ timeout: 3000 })

  // Click the button in the header
  await page.getByRole('button', { name: /Season Walkthrough/i }).click()
  await expect(page.locator('text=Welcome to the EGS Admin Panel')).toBeVisible()
  console.log('✅ Season Walkthrough button re-opens modal')

  // Progress bar should be at step 1 (1/6 = ~17%)
  const progressBar = page.locator('.bg-blue-500.h-full')
  await expect(progressBar).toBeVisible()

  // Cleanup
  await markWalkthroughSeen(page)
})

// ─── Test 8: CTA link navigates to correct page ───────────────────────────────

test('walkthrough: CTA link navigates to correct page and closes modal', async ({ page }) => {
  await goToDashboard(page)
  await clearWalkthrough(page)
  await page.reload()

  await expect(page.locator('text=Welcome to the EGS Admin Panel')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()

  // Click "Go to Data Uploads"
  await page.locator('a', { hasText: 'Go to Data Uploads' }).click()
  await page.waitForURL('**/admin/uploads', { timeout: 10000 })
  await expect(page.locator('text=Welcome to the EGS Admin Panel')).not.toBeVisible()
  console.log('✅ CTA link navigates to Data Uploads and closes modal')

  // Cleanup (already set by dismiss logic)
})
