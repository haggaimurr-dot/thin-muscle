import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Demo community')
test('failed follow retains state and rankings explain their rules', async ({ page }) => {
  await page.goto('/#/community')
  await page.getByRole('button', { name: '发现伙伴', exact: true }).click()
  const card = page.locator('.person-card').first()
  const before = await card.getByRole('button').innerText()
  await page.route('**/api/v1/home/follows/*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: '关注服务测试失败' }),
    }),
  )
  await card.getByRole('button').click()
  await expect(page.locator('.toast')).toContainText('关注服务测试失败')
  await expect(card.getByRole('button')).toHaveText(before)
  await page.getByRole('button', { name: '训练排行榜', exact: true }).click()
  await page.getByText('榜单计算规则', { exact: true }).click()
  await expect(page.locator('main')).toContainText('1、1、3')
  await page.getByRole('button', { name: '本月', exact: true }).click()
  await expect(page.locator('main')).toContainText('非自然月')
})
