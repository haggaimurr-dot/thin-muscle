import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Demo navigation')
test('skip link and modal focus remain usable by keyboard', async ({ page }) => {
  await page.goto('/#/training')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: '跳到主要内容' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: '保存并继续下一组' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(
    page.locator('.exercise-row').first().getByRole('button', { name: '记录', exact: true }),
  ).toBeFocused()
})
