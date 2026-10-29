import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Local archive')
test('image archive validates, previews, cancels and restores; daily snapshot retains one copy', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('archive-seed')) {
      localStorage.setItem('archive-seed', 'true')
      localStorage.setItem(
        'tm_logs_v2',
        JSON.stringify({
          '2026-01-05|1-am': [
            {
              id: 'archive-log',
              name: 'Archive action',
              photos: [
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jgVQAAAAASUVORK5CYII=',
              ],
            },
          ],
        }),
      )
    }
  })
  await page.goto('/#/')
  const center = page.getByRole('region', { name: '自动备份与图片归档' })
  await center.getByLabel('启用本机每日自动备份').check()
  await expect(center.getByRole('button', { name: '预览恢复快照' })).toHaveCount(1)
  await page.reload()
  await expect(center.getByRole('button', { name: '预览恢复快照' })).toHaveCount(1)
  const download = page.waitForEvent('download')
  await center.getByRole('button', { name: '下载含图片完整归档' }).click()
  const downloaded = await download
  const file = await downloaded.path()
  await page.evaluate(() => localStorage.setItem('tm_logs_v2', '{}'))
  await page.reload()
  await center.getByLabel('选择完整图片归档').setInputFiles(file)
  const preview = page.getByRole('dialog', { name: '确认恢复备份内容' })
  await expect(preview).toContainText('已校验图片 1 张')
  await preview.getByRole('button', { name: '取消恢复', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('tm_logs_v2'))).toBe('{}')
  await center.getByLabel('选择完整图片归档').setInputFiles(file)
  await preview.getByRole('button', { name: '确认恢复记录及图片' }).click()
  await expect(preview).not.toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('tm_logs_v2'))).toContain('Archive action')
  await center
    .getByLabel('选择完整图片归档')
    .setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        '{"format":"thin-muscle-archive","version":1,"images":[],"sha256":"broken"}',
      ),
    })
  await expect(center.getByRole('alert')).toContainText('校验失败')
  expect(await page.evaluate(() => localStorage.getItem('tm_logs_v2'))).toContain('Archive action')
})
