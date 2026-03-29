import { test, expect } from '@playwright/test'

test('admin: add and delete TEST FIELD', async ({ page }) => {
  // ── 1. Login ────────────────────────────────────────────────
  await page.goto('/admin/login')
  await page.fill('input[type="password"]', 'Phoenix3@')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin', { timeout: 15000 })
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  // ── 2. Click Fields in the admin nav ────────────────────────
  await page.click('a[href="/admin/fields"]')
  await page.waitForURL('**/admin/fields', { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /field status/i })).toBeVisible()

  // ── 3. Open the Add Field form ───────────────────────────────
  await page.click('a[href="/admin/fields?add=1"]')
  await page.waitForURL('**/admin/fields?add=1', { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /add field/i })).toBeVisible()

  // ── 4. Fill in the form ──────────────────────────────────────
  // Field ID input (first one — the editable one, not the hidden)
  await page.locator('input[name="id"]:not([type="hidden"])').fill('test-field-001')
  await page.locator('input[name="name"]').fill('TEST FIELD')

  // Select Cherry Island from the complex dropdown — it auto-fills address etc.
  await page.locator('select[name="complex"]').selectOption('Cherry Island Complex')
  await page.waitForTimeout(300) // let auto-fill populate

  await page.locator('input[name="updatedBy"]').fill('Playwright Test')

  // ── 5. Submit ────────────────────────────────────────────────
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin/fields', { timeout: 10000 })

  // ── 6. Verify field appears in the list ──────────────────────
  await expect(page.getByText('TEST FIELD')).toBeVisible()
  console.log('✅ TEST FIELD added successfully')

  // ── 7. Delete the field ──────────────────────────────────────
  // Click Delete next to TEST FIELD row
  const fieldRow = page.locator('div').filter({ hasText: 'TEST FIELD' }).first()
  const deleteBtn = fieldRow.getByRole('button', { name: /delete/i })
  await deleteBtn.click()

  // Confirm deletion dialog if present
  await page.waitForTimeout(500)
  const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i })
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click()
  }

  await page.waitForURL('**/admin/fields', { timeout: 10000 })

  // ── 8. Verify field is gone ───────────────────────────────────
  await expect(page.getByText('TEST FIELD')).not.toBeVisible()
  console.log('✅ TEST FIELD deleted successfully')
})
