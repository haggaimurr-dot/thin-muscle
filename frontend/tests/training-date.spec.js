import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Uses local demo data')

test('cross month/year navigation, read-only preview and historical write isolation', async ({
  page,
}) => {
  await page.goto('/#/training')
  const input = page.getByLabel('训练日期', { exact: true })
  await input.fill('2025-12-31')
  await expect(page.locator('main')).toContainText('2025-12-29 起的一周')
  await page.getByRole('button', { name: '下一周', exact: true }).click()
  await expect(input).toHaveValue('2026-01-07')
  await page.getByRole('button', { name: '上一周', exact: true }).click()
  await expect(input).toHaveValue('2025-12-31')
  const before = await page.evaluate(() => ({
    phase: localStorage.getItem('tm_phase'),
    checks: localStorage.getItem('tm_ex_checks_v2'),
    plans: localStorage.getItem('tm_vue_plans'),
  }))
  for (const n of ['1', '2', '3', '4']) {
    await page.getByLabel('只读阶段预览').selectOption(n)
    await expect(page.locator('.exercise-row input').first()).toBeDisabled()
    await expect(
      page.locator('.exercise-row').first().getByRole('button', { name: '记录', exact: true }),
    ).toBeDisabled()
    await expect(page.getByRole('button', { name: '完成本时段', exact: true })).toBeDisabled()
  }
  expect(
    await page.evaluate(() => ({
      phase: localStorage.getItem('tm_phase'),
      checks: localStorage.getItem('tm_ex_checks_v2'),
      plans: localStorage.getItem('tm_vue_plans'),
    })),
  ).toEqual(before)
  await page.getByLabel('只读阶段预览').selectOption('')
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  await page.getByRole('dialog').getByLabel('次数 / 时长').fill('8')
  await page.getByRole('button', { name: '保存记录', exact: true }).click()
  await page.getByRole('button', { name: '完成本时段', exact: true }).click()
  const records = await page.evaluate(() => ({
    logs: JSON.parse(localStorage.getItem('tm_logs_v2')),
    checks: JSON.parse(localStorage.getItem('tm_ex_checks_v2')),
  }))
  expect(records.logs['2025-12-29|3-am']).toHaveLength(1)
  expect(Object.keys(records.checks)).toEqual(['2025-12-29'])
  await page.getByRole('button', { name: '回到今天', exact: true }).click()
  await expect(input).toHaveValue(
    await page.evaluate(() => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }),
  )
})
