import { test, expect } from '@playwright/test'
test.skip(
  !!process.env.AUTH_E2E,
  'Demo header fixture; production permissions covered by backend session tests',
)

test('upload a private draft, persist image and calorie basis, edit and keep pending foods off the public shelf', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/nutrition')
  await page.getByRole('button', { name: '自建与共享食品', exact: true }).click()
  const library = page.getByRole('region', { name: '用户自建食品' })
  await library.getByRole('button', { name: '上传自建食品', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const name = '测试燕麦零食' + Date.now()
  await dialog.getByLabel('食品名称（必填）', { exact: true }).fill(name)
  await dialog.getByLabel('食品种类（必填）', { exact: true }).fill('零食')
  await dialog.getByLabel('热量数值（必填）', { exact: true }).fill('200')
  await dialog.getByLabel('上述热量对应克重（必填）', { exact: true }).fill('50')
  await dialog.getByLabel('食品或热量信息图片（选填）').setInputFiles({
    name: 'food.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await dialog.getByRole('button', { name: '保存食品并智能分组' }).click()
  await expect(dialog).toHaveCount(0)
  const card = library.locator('.user-food-card').filter({ hasText: name })
  await expect(card).toContainText('4 kcal / 克')
  await expect(card).toContainText('私有')
  await expect(card).toContainText('待AI分类')
  await expect(card.getByRole('img')).toBeVisible()
  await expect(card.getByRole('button', { name: '上架食品', exact: true })).toBeDisabled()
  await card.getByRole('button', { name: '编辑食品' }).click()
  await expect(dialog.getByLabel('热量数值（必填）', { exact: true })).toHaveValue('200')
  await dialog.getByLabel('热量数值（必填）', { exact: true }).fill('210')
  await dialog.getByRole('button', { name: '保存食品并智能分组' }).click()
  await expect(card).toContainText('4.2 kcal / 克')
  await card.getByRole('button', { name: '设为公开' }).click()
  await expect(card.getByRole('button', { name: '设为私有' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('user-foods-mobile.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await page.getByRole('button', { name: '自建与共享食品', exact: true }).click()
  await library.getByRole('button', { name: '我的上传', exact: true }).click()
  await expect(card).toContainText('4.2 kcal / 克')
  await library.getByRole('button', { name: '已上架食品', exact: true }).click()
  await expect(library.locator('.user-food-card').filter({ hasText: name })).toHaveCount(0)
})

test('classified foods can be grouped, recorded, shelved, and made private through owner controls', async ({
  page,
}) => {
  const food = {
    id: 'fixture-food',
    name: '分类完成的测试饼干',
    food_kind: '零食',
    energy: 200,
    energy_unit: 'kcal',
    basis_grams: 50,
    kcal: 400,
    protein: null,
    carb: null,
    fat: null,
    note: '按包装热量',
    visibility: 'public',
    status: 'listed',
    category: '糕饼点心类',
    classification_status: 'ready',
    classification_note: 'AI分类依据：饼干',
    revision: 1,
    has_image: false,
    is_owner: true,
  }
  await page.route('**/api/v1/foods**', async (route) => {
    if (route.request().method() === 'PATCH') {
      Object.assign(food, route.request().postDataJSON())
      food.revision++
      await route.fulfill({ json: food })
      return
    }
    const url = new URL(route.request().url())
    const show =
      (url.searchParams.get('scope') === 'mine' || food.status === 'listed') &&
      (!url.searchParams.get('category') ||
        url.searchParams.get('category') === '全部' ||
        url.searchParams.get('category') === food.category)
    await route.fulfill({
      json: { items: show ? [food] : [], total: show ? 1 : 0, page: 1, page_size: 18 },
    })
  })
  await page.goto('/#/nutrition')
  await page.getByRole('button', { name: '自建与共享食品', exact: true }).click()
  const panel = page.getByRole('region', { name: '热量评估', exact: true })
  const library = page.getByRole('region', { name: '用户自建食品' })
  await panel.getByLabel('食品分类', { exact: true }).selectOption('糕饼点心类')
  await expect(library.locator('.user-food-card')).toContainText('糕饼点心类')
  await library.getByRole('button', { name: '＋ 加入组合', exact: true }).click()
  await panel.locator('.combination-row').getByLabel('食用数量').fill('50')
  await expect(panel.locator('.combination-total')).toContainText('未提供不代表零含量')
  await panel.getByRole('button', { name: '确认组合并计入今日' }).click()
  await expect(page.locator('.history-row')).toContainText('200 kcal')
  await expect(page.locator('.protein-ring strong')).toHaveText('0')
  await library.getByRole('button', { name: '我的上传', exact: true }).click()
  await library.getByRole('button', { name: '下架食品', exact: true }).click()
  await expect(library.getByRole('button', { name: '上架食品', exact: true })).toBeVisible()
  await library.getByRole('button', { name: '上架食品', exact: true }).click()
  await expect(library.getByRole('button', { name: '下架食品', exact: true })).toBeVisible()
  await library.getByRole('button', { name: '设为私有' }).click()
  await expect(library.getByRole('button', { name: '设为公开' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.history-row')).toContainText('200 kcal')
})
