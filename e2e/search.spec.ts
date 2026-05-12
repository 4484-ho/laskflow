import { test, expect } from '@playwright/test'

test('Cmd+K で Issue タイトル検索 → 選択でスライドオーバーへ遷移', async ({ page }) => {
  await page.goto('/issues')

  const dialog = page.getByRole('dialog', { name: 'Command palette' })
  await page.keyboard.press('Meta+k')
  await expect(dialog.getByPlaceholder(/search/i)).toBeVisible()

  const searchDone = page.waitForResponse(
    (r) => r.url().includes('/api/search') && r.url().includes('searchable') && r.ok(),
  )
  await page.keyboard.type('searchable')
  await searchDone

  const issueOption = dialog.getByRole('option', { name: /E2E Todo Issue searchable/ })
  await expect(issueOption).toBeVisible()
  await issueOption.click()

  await expect(page).toHaveURL(/selected=/)
})
