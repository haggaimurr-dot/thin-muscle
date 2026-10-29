import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Uses local records')
test('continuous entry retains values and compares the preceding group', async ({ page }) => {
  await page.goto('/#/training')
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('.info-box')).toHaveCount(0)
  await dialog.getByLabel('重量').fill('16')
  await dialog.getByLabel('组数', { exact: true }).fill('1')
  await dialog.getByLabel('次数 / 时长').fill('8')
  await dialog.getByRole('button', { name: '保存并继续下一组' }).click()
  await expect(dialog.getByLabel('重量')).toBeFocused()
  await expect(dialog.locator('.info-box')).toContainText('16 · 1 × 8 · RPE 7')
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('组数', { exact: true })).toBeFocused()
  await dialog.getByLabel('次数 / 时长').fill('9')
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: '训练记录', exact: true }).click()
  await expect(page.locator('.history-row')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.history-row')).toHaveCount(2)
})

test('storage failure preserves input and retry saves one record', async ({ page }) => {
  await page.goto('/#/training')
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('重量').fill('18')
  await dialog.getByLabel('次数 / 时长').fill('7')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    window.restoreStorage = () => {
      Storage.prototype.setItem = original
    }
    Storage.prototype.setItem = function (key, value) {
      if (key === 'tm_logs_v2') throw new DOMException('full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('重量')).toHaveValue('18')
  await expect(page.getByRole('status')).toContainText('本机存储失败')
  await page.evaluate(() => window.restoreStorage())
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: '训练记录', exact: true }).click()
  await page.reload()
  await expect(page.locator('.history-row')).toHaveCount(1)
  await expect(page.locator('.history-row')).toContainText('18')
})
