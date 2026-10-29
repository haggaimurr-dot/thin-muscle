import { test, expect } from '@playwright/test'
test.skip(!process.env.AUTH_E2E, 'Account image restoration')
test('archive restores uploaded images under another account with new authorized references', async ({
  page,
}) => {
  async function register(prefix) {
    await page.getByRole('button', { name: '没有账号？创建账号' }).click()
    await page.getByLabel('用户名', { exact: true }).fill(prefix + Date.now())
    await page.getByLabel('密码', { exact: true }).fill('Archive-Password-123')
    await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  }
  await page.goto('/#/training')
  await register('archive_a_')
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    return canvas.toDataURL().split(',')[1]
  })
  const record = page.getByRole('dialog')
  await record.getByLabel('次数 / 时长').fill('8')
  await record
    .getByLabel('添加训练图片', { exact: true })
    .setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
  await record.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(record).not.toBeVisible()
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  const first = await (await page.request.get('/api/v1/data')).json()
  const oldId = Object.values(first.data.logs).flat()[0].photos[0]
  await page.goto('/#/')
  const center = page.getByRole('region', { name: '自动备份与图片归档' })
  const downloading = page.waitForEvent('download')
  await center.getByRole('button', { name: '下载含图片完整归档' }).click()
  const path = await (await downloading).path()
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await register('archive_b_')
  await center.getByLabel('选择完整图片归档').setInputFiles(path)
  const preview = page.getByRole('dialog', { name: '确认恢复备份内容' })
  await expect(preview).toContainText('已校验图片 1 张')
  await preview.getByRole('button', { name: '确认恢复记录及图片' }).click()
  await expect(preview).not.toBeVisible()
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  const second = await (await page.request.get('/api/v1/data')).json()
  const newId = Object.values(second.data.logs).flat()[0].photos[0]
  expect(newId).not.toBe(oldId)
  expect((await page.request.get('/api/v1/photos/' + oldId)).status()).toBe(404)
  expect((await page.request.get('/api/v1/photos/' + newId)).status()).toBe(200)
  await page.goto('/#/market')
  await page.getByRole('button', { name: '订单与交易台账', exact: true }).click()
  await expect(page.getByRole('region', { name: '订单与交易台账' })).toContainText('暂无订单')
  await page.reload()
  expect(
    Object.values((await (await page.request.get('/api/v1/data')).json()).data.logs).flat()[0]
      .photos[0],
  ).toBe(newId)
})
