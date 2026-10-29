import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Local records')
test('legacy backups default goals and malformed goal backups are rejected', async ({ page }) => {
  await page.goto('/#/')
  const result = await page.evaluate(async () => {
    const { parseBackup } = await import('/src/store.js')
    const data = {
      tm_phase: 1,
      tm_logs_v2: {},
      tm_done_v2: {},
      tm_pro_g_v2: {},
      tm_pro_hits_v2: {},
      tm_ex_checks_v2: {},
      tm_video_bind_v1: {},
      tm_meal_hist_v1: [],
      tm_ai_hist_v1: [],
      tm_vue_plans: {},
    }
    const legacy = parseBackup(JSON.stringify(data))
    try {
      parseBackup(
        JSON.stringify({
          ...data,
          tm_period_goals_v1: { '2025-02': { strength_days: 29, protein_days: 20 } },
        }),
      )
      return false
    } catch {
      return Object.keys(legacy.tm_period_goals_v1).length === 0
    }
  })
  expect(result).toBe(true)
})
test('month/year trends, independent targets, reload and narrow screen', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'tm_done_v2',
      JSON.stringify({ '2025-12-29': { 1: true, 3: true, 5: true } }),
    )
    localStorage.setItem(
      'tm_pro_g_v2',
      JSON.stringify({ '2025-12-29': { 3: 149, 4: 150, 5: 155 } }),
    )
  })
  await page.goto('/#/')
  const section = page.getByRole('region', { name: '长期趋势与个人目标' })
  await section.getByLabel('统计月份').fill('2026-01')
  await expect(section).toContainText('力量训练 1 / 12 天')
  await expect(section).toContainText('蛋白达标 2 / 20 天')
  await section.getByLabel('力量训练目标天数').fill('2')
  await section.getByLabel('蛋白达标目标天数').fill('4')
  await section.getByRole('button', { name: '保存本周期目标' }).click()
  await expect(section).toContainText('力量训练 1 / 2 天')
  await expect(section).toContainText('50% 完成')
  await page.reload()
  await section.getByLabel('统计月份').fill('2026-01')
  await expect(section).toContainText('力量训练 1 / 2 天')
  await section.getByLabel('统计月份').fill('2025-12')
  await expect(section).toContainText('力量训练 2 / 12 天')
  await section.getByLabel('统计周期').selectOption('year')
  await section.getByLabel('统计年份').fill('2026')
  await expect(section).toContainText('力量训练 1 / 156 天')
  await section.locator('summary').click()
  await expect(section.locator('tbody tr').first()).toContainText('2026-01')
  await section.getByLabel('统计年份').fill('2023')
  await expect(section).toContainText('本周期还没有')
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  }
})
