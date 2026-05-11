import { test, expect } from '@playwright/test'
import { seed } from './seed'

test.beforeAll(async () => {
  await seed()
})

test('Cmd+K で Issue タイトル検索 → 選択でスライドオーバーへ遷移', async ({ page }) => {
  await page.goto('/issues')

  await page.keyboard.press('Meta+k')
  await expect(page.getByPlaceholder(/search/i)).toBeVisible()

  await page.keyboard.type('searchable')

  await expect(page.getByText('E2E Todo Issue searchable')).toBeVisible()

  await page.getByText('E2E Todo Issue searchable').click()

  await expect(page).toHaveURL(/selected=/)
})
