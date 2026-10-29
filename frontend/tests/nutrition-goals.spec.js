import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Local date goals')
test('nutrition goals retain historical values, affect overview and persist', async ({ page }) => {
  await page.goto('/#/nutrition')
  const panel = page.getByRole('region', { name: '分日期营养目标' })
  await panel.getByLabel('营养目标生效日期').fill('2026-01-01')
  for (const [label, value] of [
    ['目标热量（kcal）', '1800'],
    ['目标蛋白（g）', '100'],
    ['目标碳水（g）', '200'],
    ['目标脂肪（g）', '60'],
  ])
    await panel.getByLabel(label, { exact: true }).fill(value)
  await panel.getByRole('button', { name: '保存分日期营养目标' }).click()
  await panel.getByLabel('营养目标生效日期').fill('2026-10-01')
  await panel.getByLabel('目标蛋白（g）', { exact: true }).fill('120')
  await panel.getByRole('button', { name: '保存分日期营养目标' }).click()
  await panel.getByLabel('查看营养日期').fill('2026-09-30')
  await expect(panel).toContainText('蛋白（g）：0 / 100')
  await panel.getByLabel('查看营养日期').fill('2026-10-01')
  await expect(panel).toContainText('蛋白（g）：0 / 120')
  await page.reload()
  await expect(panel).toContainText('营养目标历史（2）')
  await expect(page.locator('.protein-ring')).toContainText('/ 120 g')
  await page.goto('/#/')
  await expect(page.locator('.protein-line')).toContainText('/ 120 g')
})
