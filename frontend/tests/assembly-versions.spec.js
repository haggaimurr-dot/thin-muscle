import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Demo assembly')
test('keyboard and drag sorting, immutable version and confirmed rollback', async ({ page }) => {
  await page.goto('/#/market')
  const headers = { 'X-User-Id': '4' }
  const seed = await page.request.post('http://127.0.0.1:8001/api/v1/market/assemble', {
    headers,
    data: {
      title: 'Order test',
      cycle: 'week',
      ack_weight: true,
      ack_level: true,
      days: [
        {
          day_type: 'push',
          session: 'pm',
          exercises: [
            { name: 'Order A', sets: 3, reps: '10' },
            { name: 'Order B', sets: 2, reps: '8' },
          ],
        },
      ],
    },
  })
  expect(seed.ok()).toBeTruthy()
  const old = (await seed.json()).plan_id
  await page.getByRole('button', { name: '拼装训练方案', exact: true }).click()
  await page.getByRole('button', { name: '加载方案版本' }).click()
  const history = page.locator('.history-row').filter({ hasText: '#' + old + ' Order test' })
  await history.getByRole('button', { name: '预览并恢复此版本' }).click()
  await page.getByRole('button', { name: '下移动作Order A', exact: true }).click()
  await expect(page.locator('.compose-exercise strong').first()).toHaveText('Order B')
  await page.locator('.drag-handle').first().dragTo(page.locator('.compose-exercise strong').last())
  await expect(page.locator('.compose-exercise strong').first()).toHaveText('Order A')
  await page.getByRole('button', { name: '下移动作Order A', exact: true }).click()
  async function confirm() {
    await page.getByLabel('我确认体重符合所选方案的适配区间').check()
    await page.getByLabel('我确认训练水平与方案匹配').check()
    await page.getByRole('button', { name: '应用到本周训练', exact: true }).click()
    await page.getByRole('button', { name: '确认替换并应用' }).click()
    await expect(page.getByRole('dialog', { name: '确认替换本周计划' })).not.toBeVisible()
  }
  await confirm()
  let versions = await (
    await page.request.get('http://127.0.0.1:8001/api/v1/market/assemblies', { headers })
  ).json()
  expect(versions.items[0].days[0].exercises[0].name).toBe('Order B')
  await history.getByRole('button', { name: '预览并恢复此版本' }).click()
  await confirm()
  versions = await (
    await page.request.get('http://127.0.0.1:8001/api/v1/market/assemblies', { headers })
  ).json()
  expect(versions.items[0].restored_from_id).toBe(old)
  expect(versions.items[0].days[0].exercises[0].name).toBe('Order A')
  expect(versions.items.find((v) => v.plan_id === old).days[0].exercises[0].name).toBe('Order A')
})
