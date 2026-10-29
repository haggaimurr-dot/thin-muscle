import { test, expect } from '@playwright/test'
test.skip(!process.env.AUTH_E2E, 'Requires account mode')

async function register(page) {
  const name = 'security_' + Date.now()
  await page.goto('/#/nutrition')
  await page.getByRole('button', { name: '没有账号？创建账号' }).click()
  await page.getByLabel('用户名', { exact: true }).fill(name)
  await page.getByLabel('密码', { exact: true }).fill('Original-password-123')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  return name
}

test('change password checks mismatch and current password and invalidates another browser', async ({
  page,
  browser,
}) => {
  const name = await register(page)
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const other = await context.newPage()
  await other.goto('/#/nutrition')
  await other.getByLabel('用户名', { exact: true }).fill(name)
  await other.getByLabel('密码', { exact: true }).fill('Original-password-123')
  await other.getByRole('button', { name: '登录', exact: true }).click()
  await expect(other.locator('.sync-banner')).toContainText('已同步到账号')
  await page.getByRole('button', { name: '账号安全', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('邮件服务尚未配置')
  await expect(dialog.getByRole('button', { name: '发送邮箱验证链接' })).toBeDisabled()
  const methods = dialog.getByRole('region', { name: '登录方式管理' })
  await expect(methods).toContainText('用户名：' + name)
  await expect(methods.getByRole('button', { name: /^解绑/ })).toBeDisabled()
  await expect(methods).toContainText('短信渠道尚未配置')
  await expect(methods).toContainText('微信渠道尚未配置')
  await dialog.getByLabel('当前密码', { exact: true }).fill('wrong-password')
  await dialog.getByLabel('新密码', { exact: true }).fill('Changed-password-123')
  await dialog.getByLabel('确认新密码', { exact: true }).fill('Mismatch-password-123')
  await dialog.getByRole('button', { name: '修改密码并退出所有设备' }).click()
  await expect(dialog.getByRole('alert')).toContainText('两次新密码不一致')
  await dialog.getByLabel('确认新密码', { exact: true }).fill('Changed-password-123')
  await dialog.getByRole('button', { name: '修改密码并退出所有设备' }).click()
  await expect(dialog.getByRole('alert')).toContainText('当前密码不正确')
  await dialog.getByLabel('当前密码', { exact: true }).fill('Original-password-123')
  await dialog.getByRole('button', { name: '修改密码并退出所有设备' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await other.reload()
  await expect(other.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await page.getByLabel('用户名', { exact: true }).fill(name)
  await page.getByLabel('密码', { exact: true }).fill('Original-password-123')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('用户名或密码不正确')
  await page.getByLabel('密码', { exact: true }).fill('Changed-password-123')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  await context.close()
})

test('delete requires explicit confirmation, clears cache and cloud records and prevents login', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const name = await register(page)
  await page.getByRole('button', { name: '+25g', exact: true }).click()
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  const keys = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith('tm_account_cache_')),
  )
  expect(keys).toHaveLength(1)
  await page.getByRole('button', { name: '展开导航' }).click()
  await page.getByRole('button', { name: '账号安全', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('当前密码', { exact: true }).fill('Original-password-123')
  await dialog.locator('summary').click()
  await expect(dialog.getByRole('button', { name: '永久注销账号并清除记录' })).toBeDisabled()
  await dialog.getByLabel('注销确认').fill('注销我的账号')
  await dialog.getByRole('button', { name: '永久注销账号并清除记录' }).click()
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), keys[0])).toBeNull()
  await page.getByLabel('用户名', { exact: true }).fill(name)
  await page.getByLabel('密码', { exact: true }).fill('Original-password-123')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('用户名或密码不正确')
})

test('recovery handles unconfigured mail and expired links without pretending success', async ({
  page,
}) => {
  await page.goto('/#/')
  await page.getByRole('link', { name: '忘记密码？通过恢复邮箱找回' }).click()
  await page.getByLabel('用户名', { exact: true }).fill('missing_account')
  await page.getByLabel('恢复邮箱').fill('test@example.test')
  await page.getByRole('button', { name: '发送重置链接' }).click()
  await expect(page.getByRole('alert')).toContainText('邮件服务尚未配置')
  await page.goto('/#/?account_action=reset_password&token=' + 'x'.repeat(43))
  await page.getByLabel('新密码', { exact: true }).fill('Recovered-password-123')
  await page.getByLabel('确认新密码', { exact: true }).fill('Recovered-password-123')
  await page.getByRole('button', { name: '确认重置密码' }).click()
  await expect(page.getByRole('alert')).toContainText('链接无效或已过期')
})
