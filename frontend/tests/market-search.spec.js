import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Seeded market')
test('keyword search and price sort combine with market filters', async ({ page }) => {
  await page.goto('/#/market')
  await expect(page.locator('.product-card').first()).toBeVisible()
  await page.getByLabel('搜索作品').fill('没有这个作品_xyz')
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await expect(page.locator('.product-card')).toHaveCount(0)
  await page.getByLabel('搜索作品').fill('')
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.getByLabel('作品排序').selectOption('price_asc')
  await expect(page.locator('.product-card').first()).toBeVisible()
  const response = await page.request.get('/api/v1/market/listings?sort=price_asc')
  const items = (await response.json()).items
  expect(items.map((i) => i.price_fen)).toEqual(items.map((i) => i.price_fen).sort((a, b) => a - b))
})
