import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Local history')
test('training history filters actual dates and exercise names', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'tm_logs_v2',
      JSON.stringify({
        '2025-12-29|1-am': [{ id: 'a', name: '深蹲', weight: '10', sets: '1', reps: '8' }],
        '2025-12-29|5-am': [{ id: 'b', name: '卧推', weight: '10', sets: '1', reps: '8' }],
      }),
    ),
  )
  await page.goto('/#/training?view=history')
  await expect(page.locator('.history-row')).toHaveCount(2)
  await page.getByLabel('开始日期').fill('2026-01-01')
  await expect(page.locator('.history-row')).toHaveCount(1)
  await expect(page.locator('.history-row')).toContainText('卧推')
  await page.getByLabel('搜索训练动作').fill('深蹲')
  await expect(page.locator('.history-row')).toHaveCount(0)
  await page.getByRole('button', { name: '清空筛选' }).click()
  await expect(page.locator('.history-row')).toHaveCount(2)
})
