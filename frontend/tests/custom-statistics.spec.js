import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Local stats')
test('personal overview reflects custom training days while disclosing public rules', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const w = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const plan = (type) => ({
      type,
      label: type,
      am: [{ name: 'Action', sets: 1, reps: '5' }],
      pm: [],
    })
    localStorage.setItem(
      'tm_vue_plans',
      JSON.stringify({
        [w]: { 1: plan('rest'), 2: plan('push'), 3: plan('rest'), 5: plan('rest') },
      }),
    )
    localStorage.setItem('tm_done_v2', JSON.stringify({ [w]: { 1: true, 2: true } }))
  })
  await page.goto('/#/')
  const card = page.locator('.metric-card').first()
  await expect(card.locator('.metric-value')).toHaveText(/1\s*\/\s*1 天/)
  await card.locator('summary').click()
  await expect(card).toContainText('自定义计划按日类型')
  await expect(card).toContainText('公共榜单和徽章仍使用其固定日期规则')
})
