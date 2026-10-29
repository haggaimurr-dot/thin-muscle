import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Uses local video bindings')
test('reject unsupported video formats and offer recovery for blocked embeds', async ({ page }) => {
  await page.goto('/#/training')
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: /教学视频$/ })
    .click()
  const dialog = page.getByRole('dialog')
  for (const url of [
    'javascript:alert(1)',
    'https://example.com/video/BV1xx411c7mD',
    'https://www.bilibili.com/video/BVbad',
    'https://bilibili.com.evil.test/video/BV1xx411c7mD',
    'https://b23.tv/test',
  ]) {
    await dialog.getByLabel('视频链接').fill(url)
    await dialog.getByRole('button', { name: '保存视频链接' }).click()
    await expect(page.getByRole('status')).toContainText('B站视频链接')
  }
  await dialog.getByLabel('视频链接').fill('https://www.bilibili.com/video/BV1xx411c7mD')
  await dialog.getByRole('button', { name: '保存视频链接' }).click()
  await page.route('https://player.bilibili.com/**', (route) => route.abort())
  await dialog.getByRole('button', { name: '内嵌试播' }).first().click()
  await expect(dialog).toContainText('若播放器空白、视频失效或被限制')
  await expect(dialog.getByRole('link').first()).toHaveAttribute(
    'href',
    'https://www.bilibili.com/video/BV1xx411c7mD',
  )
  await expect(dialog.getByLabel('视频链接')).toBeVisible()
})
