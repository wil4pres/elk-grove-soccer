import { test, expect } from '@playwright/test'

const FIELD_ID = 'test-field-001'
const FIELD = {
  id: FIELD_ID,
  name: 'TEST FIELD Alpha',
  complex: 'Cherry Island Complex',
  address: '6300 Bilby Rd, Elk Grove, CA 95758',
  parking: 'Lots A and B — enter from Bilby Rd. Arrive 20 min early.',
  amenities: 'Restrooms near concession stand. Concession stand open game days.',
  status: 'open',
  notes: 'Surface clear. Trainers on site.',
  updatedBy: 'Playwright Test',
}

const EDIT = {
  name: 'TEST FIELD Alpha EDITED',
  notes: 'Wet conditions — cleats required.',
  status: 'delay',
  updatedBy: 'Playwright Edit',
}

async function login(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.fill('input[type="password"]', 'Phoenix3@')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin', { timeout: 15000 })
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

test('admin: full field lifecycle — add, verify, edit, verify edit, delete', async ({ page }) => {
  // ── 1. Login ─────────────────────────────────────────────────
  await login(page)
  console.log('✅ Logged in')

  // ── 2. Navigate to Fields ─────────────────────────────────────
  await page.click('a[href="/admin/fields"]')
  await page.waitForURL('**/admin/fields', { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /field status/i })).toBeVisible()
  console.log('✅ On Fields page')

  // ── 3. Open Add Field form ────────────────────────────────────
  await page.click('a[href="/admin/fields?add=1"]')
  await page.waitForURL('**/admin/fields?add=1', { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /add field/i })).toBeVisible()

  // ── 4. Fill every field ───────────────────────────────────────
  await page.locator('input[placeholder="ci-f3"]').fill(FIELD.id)
  await page.locator('input[placeholder="Field 3"]').fill(FIELD.name)

  // Complex — select from dropdown (auto-fills address/parking/amenities)
  await page.locator('select').first().selectOption(FIELD.complex)
  await page.waitForTimeout(300)

  // Status
  await page.locator('select').nth(1).selectOption(FIELD.status)

  // Address (auto-filled by complex selection — verify it populated)
  const addressInput = page.locator(`input[placeholder="6300 Bilby Rd, Elk Grove, CA 95758"]`)
  await expect(addressInput).toHaveValue(FIELD.address)

  // Parking info (auto-filled — clear and re-type to confirm input works)
  const parkingArea = page.locator('textarea').first()
  await parkingArea.clear()
  await parkingArea.fill(FIELD.parking)

  // Amenities
  const amenitiesArea = page.locator('textarea').nth(1)
  await amenitiesArea.clear()
  await amenitiesArea.fill(FIELD.amenities)

  // Notes
  await page.locator('input[placeholder="Surface clear. Trainers on site."]').fill(FIELD.notes)

  // Updated By
  await page.locator('input[placeholder="Coach Reyes"]').fill(FIELD.updatedBy)

  console.log('✅ All fields filled')

  // ── 5. Save ───────────────────────────────────────────────────
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin/fields', { timeout: 15000 })

  // ── 6. Verify field appears with correct data ─────────────────
  await expect(page.getByText(FIELD.name)).toBeVisible()
  await expect(page.getByText(FIELD.address)).toBeVisible()
  await expect(page.locator(`a[href="/admin/fields?edit=${FIELD_ID}"]`)).toBeVisible()
  console.log('✅ Field saved and visible in list')

  // ── 7. Click Edit ─────────────────────────────────────────────
  await page.click(`a[href="/admin/fields?edit=${FIELD_ID}"]`)
  await page.waitForURL(`**/admin/fields?edit=${FIELD_ID}`, { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /edit field/i })).toBeVisible()

  // Verify the form is pre-filled with saved values
  await expect(page.locator('input[placeholder="Field 3"]')).toHaveValue(FIELD.name)
  await expect(page.locator('select').first()).toHaveValue(FIELD.complex)
  await expect(page.locator('input[placeholder="6300 Bilby Rd, Elk Grove, CA 95758"]')).toHaveValue(FIELD.address)
  await expect(page.locator('textarea').first()).toHaveValue(FIELD.parking)
  await expect(page.locator('textarea').nth(1)).toHaveValue(FIELD.amenities)
  await expect(page.locator('input[placeholder="Surface clear. Trainers on site."]')).toHaveValue(FIELD.notes)
  await expect(page.locator('input[placeholder="Coach Reyes"]')).toHaveValue(FIELD.updatedBy)
  console.log('✅ Edit form pre-filled correctly')

  // ── 8. Make edits ─────────────────────────────────────────────
  await page.locator('input[placeholder="Field 3"]').clear()
  await page.locator('input[placeholder="Field 3"]').fill(EDIT.name)

  await page.locator('select').nth(1).selectOption(EDIT.status)

  await page.locator('input[placeholder="Surface clear. Trainers on site."]').clear()
  await page.locator('input[placeholder="Surface clear. Trainers on site."]').fill(EDIT.notes)

  await page.locator('input[placeholder="Coach Reyes"]').clear()
  await page.locator('input[placeholder="Coach Reyes"]').fill(EDIT.updatedBy)

  // ── 9. Save edit ──────────────────────────────────────────────
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin/fields', { timeout: 15000 })

  // ── 10. Verify edits are reflected in the list ────────────────
  await expect(page.getByText(EDIT.name, { exact: true })).toBeVisible()
  await expect(page.getByText(FIELD.name, { exact: true })).not.toBeVisible() // old name gone
  // Status badge should show "delay"
  const editedRow = page.locator(`a[href="/admin/fields?edit=${FIELD_ID}"]`).locator('../..')
  await expect(editedRow.getByText('delay', { exact: false })).toBeVisible()
  console.log('✅ Edits saved and visible in list')

  // ── 11. Delete ────────────────────────────────────────────────
  page.on('dialog', dialog => dialog.accept())

  const editLink = page.locator(`a[href="/admin/fields?edit=${FIELD_ID}"]`)
  await editLink.locator('..').locator('..').getByRole('button', { name: 'Delete' }).click()

  await page.waitForLoadState('load', { timeout: 10000 })
  await page.waitForTimeout(1000)

  // ── 12. Verify field is gone ──────────────────────────────────
  await expect(page.getByText(EDIT.name)).not.toBeVisible()
  console.log('✅ Field deleted and confirmed gone')
})
