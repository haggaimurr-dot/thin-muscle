import { test, expect } from '@playwright/test'
test.skip(!process.env.AUTH_E2E, 'Requires account uploads')
test('failed image retries separately without uploading successful images again', async ({
  page,
}) => {
  await page.goto('/#/training')
  await page.getByRole('button', { name: '没有账号？创建账号' }).click()
  await page.getByLabel('用户名', { exact: true }).fill('retry_' + Date.now())
  await page.getByLabel('密码', { exact: true }).fill('retry-password-123')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('次数 / 时长').fill('8')
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 20
    c.height = 20
    return c.toDataURL('image/png').split(',')[1]
  })
  const photo = { name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') }
  await dialog
    .getByLabel('添加训练图片', { exact: true })
    .setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') })
  await expect(page.locator('.toast')).toContainText('JPEG、PNG 或 WebP')
  await expect(dialog.locator('.photo-editor')).toHaveCount(0)
  await dialog
    .getByLabel('添加训练图片', { exact: true })
    .setInputFiles([photo, photo, photo, photo])
  await expect(page.locator('.toast')).toContainText('最多三张')
  await expect(dialog.locator('.photo-editor')).toHaveCount(0)
  await dialog.getByLabel('添加训练图片', { exact: true }).setInputFiles({
    name: 'large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
  })
  await expect(page.locator('.toast')).toContainText('8MB')
  await dialog.getByLabel('添加训练图片', { exact: true }).setInputFiles([photo, photo, photo])
  await expect(dialog.locator('.photo-editor')).toHaveCount(3)
  let calls = 0
  await page.route('**/api/v1/photos', async (route) => {
    calls++
    if (calls === 2) await route.abort('failed')
    else await route.continue()
  })
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(dialog.getByRole('button', { name: '重试图片 2' })).toBeVisible()
  await expect(dialog.getByLabel('次数 / 时长')).toHaveValue('8')
  await expect(dialog).toContainText('账号图片空间')
  await dialog.getByRole('button', { name: '重试图片 2' }).click()
  await expect(dialog.getByRole('button', { name: '重试图片 2' })).toHaveCount(0)
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(calls).toBe(4)
  await page.getByRole('button', { name: '训练记录', exact: true }).click()
  await expect(page.locator('.record-photo')).toHaveCount(3)
})
