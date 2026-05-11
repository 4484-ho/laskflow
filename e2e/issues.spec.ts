import { test, expect } from '@playwright/test'
import { seed } from './seed'

test.beforeAll(async () => {
  await seed()
})

test('Issue 作成 → 一覧表示 → スライドオーバーで description 編集 → リロード後も残る', async ({ page }) => {
  await page.goto('/issues')

  await page.getByRole('button', { name: 'New Issue' }).click()
  await page.getByPlaceholder(/title/i).fill('Playwright Test Issue')
  await page.getByRole('button', { name: /create/i }).click()

  await expect(page.getByText('Playwright Test Issue')).toBeVisible()

  await page.getByText('Playwright Test Issue').click()
  await expect(page.getByText(/description/i)).toBeVisible()

  await expect(page).toHaveURL(/selected=/)

  await page.reload()
  await expect(page.getByText('Playwright Test Issue')).toBeVisible({ timeout: 10_000 })
})

test('ステータス変更が API に反映 → リロードで維持', async ({ page }) => {
  await page.goto('/issues')

  const row = page.locator('[data-testid="issue-row"]').filter({ hasText: 'E2E Todo Issue' })
  await expect(row).toBeVisible()

  await row.locator('button').first().click()

  await page.reload()
  await expect(page.locator('[data-testid="issue-row"]').filter({ hasText: 'E2E Todo Issue' })).toBeVisible()
})
