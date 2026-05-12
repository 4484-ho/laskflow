import { test, expect } from '@playwright/test'
import { prisma } from './seed'

test('Cycle 詳細で進捗バーが seed データ通りの比率で表示される', async ({ page }) => {
  const cycle = await prisma.cycle.findFirst({ where: { title: 'E2E Cycle' } })
  if (!cycle) throw new Error('E2E Cycle not found')

  await page.goto(`/cycles/${cycle.id}`)

  await expect(page.getByText(/Progress/i)).toBeVisible()

  await expect(page.getByText('2/3 issues completed')).toBeVisible()
})
