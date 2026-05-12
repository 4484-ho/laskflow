import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// Use a dedicated SQLite file for E2E so the dev DB is never wiped. Propagate
// the same URL to the dev server we spin up via webServer.command and to the
// globalSetup / test processes via process.env.
const E2E_DATABASE_URL =
  process.env.DATABASE_URL ??
  `file:${path.join(process.cwd(), 'data', 'taskflow.e2e.db')}`
process.env.DATABASE_URL = E2E_DATABASE_URL

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  globalSetup: './global-setup.ts',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { DATABASE_URL: E2E_DATABASE_URL },
  },
})
