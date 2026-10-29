import { test, expect } from '@playwright/test'
test.skip(!process.env.AUTH_E2E, 'Run AUTH_E2E=1 npm run test:e2e -- accounts.spec.js')
test('register, sync across devices, detect conflicts, logout and isolate accounts', async ({
  page,
  browser,
}) => {
  await page.goto('/#/nutrition')
  await page.getByRole('button', { name: '没有账号？创建账号' }).click()
  await page.getByLabel('用户名', { exact: true }).fill('browser_account')
  await page.getByLabel('密码', { exact: true }).fill('browser-password-123')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await expect(page.locator('.protein-ring strong')).toHaveText('0')
  await page.getByRole('button', { name: '+25g', exact: true }).click()
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  const second = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const mobile = await second.newPage()
  await mobile.goto('/#/nutrition')
  await mobile.getByLabel('用户名', { exact: true }).fill('browser_account')
  await mobile.getByLabel('密码', { exact: true }).fill('browser-password-123')
  await mobile.getByRole('button', { name: '登录', exact: true }).click()
  await expect(mobile.locator('.protein-ring strong')).toHaveText('25')
  await mobile.getByRole('button', { name: '+25g', exact: true }).click()
  await expect(mobile.locator('.sync-banner')).toContainText('已同步到账号')
  await page.getByRole('button', { name: '+10g', exact: true }).click()
  await expect(page.locator('.sync-banner')).toContainText('版本冲突')
  await expect(page.locator('.sync-banner')).toContainText('本机修改时间')
  await expect(page.locator('.sync-banner')).toContainText('云端更新时间')
  await page.getByRole('button', { name: '重新加载云端', exact: true }).click()
  await page.getByRole('button', { name: '确认加载云端', exact: true }).click()
  await expect(page.locator('.protein-ring strong')).toHaveText('50')
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '没有账号？创建账号' }).click()
  await page.getByLabel('用户名', { exact: true }).fill('separate_account')
  await page.getByLabel('密码', { exact: true }).fill('another-password-123')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await expect(page.locator('.protein-ring strong')).toHaveText('0')
  await second.close()
})

test('training photos and notes sync between devices and remain private', async ({
  page,
  browser,
}) => {
  await page.goto('/#/training')
  await page.getByRole('button', { name: '没有账号？创建账号' }).click()
  await page.getByLabel('用户名', { exact: true }).fill('photo_account')
  await page.getByLabel('密码', { exact: true }).fill('photo-account-password')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 20
    c.height = 20
    return c.toDataURL('image/png').split(',')[1]
  })
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('次数 / 时长').fill('8')
  await dialog.getByLabel('训练心得').fill('跨设备训练心得')
  await dialog.getByLabel('添加训练图片', { exact: true }).setInputFiles({
    name: 'training.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  })
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const other = await context.newPage()
  await other.goto('/#/training?view=history')
  await other.getByLabel('用户名', { exact: true }).fill('photo_account')
  await other.getByLabel('密码', { exact: true }).fill('photo-account-password')
  await other.getByRole('button', { name: '登录', exact: true }).click()
  await expect(other.locator('.training-note')).toHaveText('跨设备训练心得')
  const imageElement = other.locator('.record-photo img')
  await expect(imageElement).toBeVisible()
  await expect.poll(() => imageElement.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await context.close()
})

test('earned badges persist on the account and appear on another device', async ({
  page,
  browser,
}) => {
  await page.goto('/#/training')
  await page.getByRole('button', { name: '没有账号？创建账号' }).click()
  await page.getByLabel('用户名', { exact: true }).fill('badge_browser')
  await page.getByLabel('密码', { exact: true }).fill('badge-browser-password')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await page.locator('.week-picker button').first().click()
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  await page.getByRole('dialog').getByLabel('次数 / 时长').fill('6')
  await page.getByRole('dialog').getByLabel('训练心得').fill('保持稳定节奏')
  await page.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(page.locator('.badge-celebration')).toContainText('倾听身体')
  await page.goto('/#/badges')
  await expect(page.locator('.badge-card.earned')).toContainText('倾听身体')
  await page.reload()
  await expect(page.locator('.badge-card.earned')).toContainText('倾听身体')
  await expect(page.locator('.badge-celebration')).toHaveCount(0)
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const other = await context.newPage()
  await other.goto('/#/badges')
  await other.getByLabel('用户名', { exact: true }).fill('badge_browser')
  await other.getByLabel('密码', { exact: true }).fill('badge-browser-password')
  await other.getByRole('button', { name: '登录', exact: true }).click()
  await expect(other.locator('.badge-card.earned')).toContainText('倾听身体')
  await context.close()
})
