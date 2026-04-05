import { defineConfig } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'https://sacramento.soccer',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    // ── Auth setup — runs once, saves session cookie ─────────────────────────
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { browserName: 'chromium' },
    },

    // ── All tests — reuse saved admin session ─────────────────────────────────
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'playwright/.auth/admin.json'),
      },
      dependencies: ['setup'],
    },
  ],
})
