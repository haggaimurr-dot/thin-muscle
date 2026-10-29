import { test, expect } from '@playwright/test'

test.skip(!!process.env.AUTH_E2E, 'Uses isolated local demo records')

test('metric explanations trace weekly boundaries and actual calculated values', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const date = new Date()
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    const ymd = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const current = ymd(date)
    date.setDate(date.getDate() - 7)
    const previous = ymd(date)
    date.setDate(date.getDate() - 7)
    const older = ymd(date)
    localStorage.setItem(
      'tm_done_v2',
      JSON.stringify({
        [current]: { 1: true, 3: true },
        [previous]: { 1: true, 5: true },
        [older]: { 1: true },
      }),
    )
    localStorage.setItem(
      'tm_pro_g_v2',
      JSON.stringify({ [current]: { 1: 149, 2: 150, 7: 155 }, [previous]: { 7: 200 } }),
    )
    localStorage.setItem(
      'tm_logs_v2',
      JSON.stringify({
        [previous + '|7-pm']: [{ name: '深蹲', weight: '20', reps: '8' }],
        [current + '|1-am']: [
          { name: '深蹲', weight: '20', reps: '9' },
          { name: '新动作', weight: '30', reps: '8' },
          { name: '自重动作', weight: '自重', reps: '10' },
        ],
      }),
    )
  })
  await page.goto('/#/')
  const cards = page.locator('.metric-card')
  for (const [i, value] of [
    [0, '2'],
    [1, '1'],
    [2, '2'],
    [3, '2'],
  ]) {
    await expect(cards.nth(i).locator('.metric-value')).toHaveText(new RegExp('^' + value))
    await cards.nth(i).locator('summary').click()
  }
  await expect(cards.nth(0)).toContainText('全部动作均勾选')
  await expect(cards.nth(1)).toContainText('深蹲：本周 20kg × 9；上周 20kg × 8 · 进步')
  await expect(cards.nth(1)).toContainText('新动作：本周 30kg × 8；上周 无记录 · 未计进步')
  await expect(cards.nth(2)).toContainText('149g · 未达标')
  await expect(cards.nth(2)).toContainText('150g · 达标')
  await expect(cards.nth(3)).toContainText('1 / 3 天 · 无效周')
})

test('empty dashboard shortcuts preserve date and session and refresh recorded totals', async ({
  page,
}) => {
  await page.goto('/#/')
  await expect(page.locator('.today-panel')).toContainText('记录第一组')
  await expect(page.locator('.nutrition-preview')).toContainText('添加第一餐')
  await page.getByRole('link', { name: '记录今日晚训', exact: true }).click()
  await expect(page.getByRole('button', { name: '晚训', exact: true })).toHaveClass(/active/)
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  await page.getByRole('dialog').getByLabel('次数 / 时长').fill('8')
  await page.getByRole('button', { name: '保存记录', exact: true }).click()
  await page.getByRole('button', { name: '完成本时段', exact: true }).click()
  await page.goto('/#/')
  await expect(page.locator('.session-preview').nth(1)).not.toContainText('还未勾选完成')
  await page.getByRole('link', { name: '去记录', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByLabel('饮食名称', { exact: true }).fill('快捷鸡胸饭')
  await page.getByRole('dialog').getByLabel('每份蛋白质').fill('42')
  await page.getByRole('button', { name: '保存并计入蛋白', exact: true }).click()
  await page.goto('/#/')
  await page.reload()
  await expect(page.locator('.protein-line')).toContainText('42')
  await page.getByRole('link', { name: '记录今日早训', exact: true }).click()
  await expect(page.getByRole('button', { name: '早训', exact: true })).toHaveClass(/active/)
})
