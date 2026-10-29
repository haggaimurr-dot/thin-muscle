import { test, expect } from '@playwright/test'
test.skip(!process.env.AUTH_E2E, 'Requires account sync')
test('period goals sync across devices and conflicts preserve local edits', async ({
  page,
  browser,
}) => {
  const username = 'goals_' + Date.now(),
    password = 'Goals-password-123'
  await page.goto('/#/')
  await page.getByRole('button', { name: '没有账号？创建账号' }).click()
  await page.getByLabel('用户名', { exact: true }).fill(username)
  await page.getByLabel('密码', { exact: true }).fill(password)
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  const section = page.getByRole('region', { name: '长期趋势与个人目标' })
  await section.getByLabel('力量训练目标天数').fill('8')
  await section.getByRole('button', { name: '保存本周期目标' }).click()
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const other = await context.newPage()
  await other.goto('/#/')
  await other.getByLabel('用户名', { exact: true }).fill(username)
  await other.getByLabel('密码', { exact: true }).fill(password)
  await other.getByRole('button', { name: '登录', exact: true }).click()
  await expect(other.getByLabel('力量训练目标天数')).toHaveValue('8')
  await other.getByLabel('力量训练目标天数').fill('9')
  await other.getByRole('button', { name: '保存本周期目标' }).click()
  await expect(other.locator('.sync-banner')).toContainText('已同步到账号')
  await section.getByLabel('力量训练目标天数').fill('10')
  await section.getByRole('button', { name: '保存本周期目标' }).click()
  await expect(page.locator('.sync-banner')).toContainText('版本冲突')
  await expect(section.getByLabel('力量训练目标天数')).toHaveValue('10')
  await page.getByRole('button', { name: '重新加载云端', exact: true }).click()
  await page.getByRole('button', { name: '确认加载云端', exact: true }).click()
  await expect(section.getByLabel('力量训练目标天数')).toHaveValue('9')
  await context.close()
})
