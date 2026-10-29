import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Local badge sharing')
test('earned badge share requires preview and confirmation', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tm_done_v2', JSON.stringify({ '2026-01-05': { 1: true } })),
  )
  await page.goto('/#/badges')
  await expect(page.locator('.badge-card')).toHaveCount(22)
  await page.locator('.badge-card').filter({ hasText: '迈出第一步' }).click()
  await page.getByRole('button', { name: '预览徽章分享卡' }).click()
  const share = page.getByRole('dialog', { name: '徽章分享卡预览' })
  await expect(share.getByRole('img')).toBeVisible()
  await expect(share.getByRole('link', { name: '下载徽章分享卡' })).toHaveCount(0)
  await share.getByLabel('我已核对分享内容').check()
  const download = page.waitForEvent('download')
  await share.getByRole('link', { name: '下载徽章分享卡' }).click()
  expect((await download).suggestedFilename()).toBe('thin-muscle-badge.svg')
})
