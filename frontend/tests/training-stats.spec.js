import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Local records')
test('volume and best records are traceable and rest timer pauses', async ({ page }) => {
  await page.clock.install()
  await page.addInitScript(() =>
    localStorage.setItem(
      'tm_logs_v2',
      JSON.stringify({
        '2025-12-29|1-am': [
          { id: 'a', name: '卧推', weight: '10', sets: '1', reps: '8' },
          { id: 'b', name: '卧推', weight: '12', sets: '2', reps: '5' },
          { id: 'c', name: '深蹲', weight: '自重', sets: '1', reps: '8' },
        ],
      }),
    ),
  )
  await page.goto('/#/training')
  const region = page.getByRole('region', { name: '组间计时与训练纪录' })
  await region.locator('summary').click()
  await expect(region).toContainText('200 kg·次')
  await expect(region).toContainText('卧推个人最佳：12kg × 5')
  await region.getByLabel('休息秒数').fill('10')
  await region.getByRole('button', { name: '重置计时' }).click()
  await region.getByRole('button', { name: '开始或继续计时' }).click()
  await page.clock.fastForward(4000)
  await expect(region.getByRole('timer')).toContainText('6 秒')
  await region.getByRole('button', { name: '暂停计时' }).click()
  await page.clock.fastForward(10000)
  await expect(region.getByRole('timer')).toContainText('6 秒')
  await page.getByRole('button', { name: '训练记录', exact: true }).click()
  await page
    .locator('.history-row')
    .filter({ hasText: '12 kg' })
    .getByRole('button', { name: '删除记录', exact: true })
    .click()
  await page.getByRole('button', { name: '确认删除', exact: true }).click()
  await expect(region).toContainText('80 kg·次')
  await expect(region).toContainText('卧推个人最佳：10kg × 8')
})
