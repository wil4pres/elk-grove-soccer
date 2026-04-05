/**
 * Playwright global auth setup — runs once before all tests.
 * Logs in as admin and saves session to playwright/.auth/admin.json
 * so individual tests don't need to log in themselves.
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/admin.json')

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/admin/login')
  await page.fill('input[type="password"]', 'Phoenix3@')
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 })
  // Verify we're actually logged in
  await expect(page.locator('body')).not.toContainText('Incorrect password')
  await page.context().storageState({ path: authFile })
})
