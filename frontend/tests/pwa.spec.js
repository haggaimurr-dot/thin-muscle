import { test, expect } from '@playwright/test'
test.skip(!process.env.PWA_E2E || !process.env.AUTH_E2E, 'Production account PWA')
test('offline cached account writes reconnect and APIs never enter service worker cache', async ({
  page,
  context,
}) => {
  await page.goto('/#/')
  await page.getByRole('button', { name: '没有账号？创建账号' }).click()
  await page.getByLabel('用户名', { exact: true }).fill('pwa_' + Date.now())
  await page.getByLabel('密码', { exact: true }).fill('Offline-Password-123')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await page.getByLabel('允许此浏览器离线打开我的记录').check()
  await page.goto('/#/nutrition')
  await page.getByRole('button', { name: '+10g', exact: true }).click()
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect(page.locator('.protein-ring strong')).toHaveText('10')
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.sync-banner')).toContainText('离线缓存，登录尚未验证')
  await page.getByRole('button', { name: '+25g', exact: true }).click()
  await expect(page.locator('.protein-ring strong')).toHaveText('35')
  await page.reload()
  await expect(page.locator('.protein-ring strong')).toHaveText('35')
  await context.setOffline(false)
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  await page.reload()
  await expect(page.locator('.protein-ring strong')).toHaveText('35')
  const paths = await page.evaluate(async () => {
    const out = []
    for (const key of await caches.keys())
      for (const req of await (await caches.open(key)).keys()) out.push(new URL(req.url).pathname)
    return out
  })
  expect(paths.some((p) => p.startsWith('/api/'))).toBeFalsy()
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('tm_offline_user'))).toBeNull()
})

test('expired offline session returns to login without losing unsynced cache', async ({
  page,
  context,
}) => {
  await page.goto('/#/')
  await page.getByRole('button', { name: '没有账号？创建账号' }).click()
  await page.getByLabel('用户名', { exact: true }).fill('expired_pwa_' + Date.now())
  await page.getByLabel('密码', { exact: true }).fill('Offline-Password-123')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await page.getByLabel('允许此浏览器离线打开我的记录').check()
  await page.goto('/#/nutrition')
  await page.getByRole('button', { name: '+10g', exact: true }).click()
  await expect(page.locator('.sync-banner')).toContainText('已同步到账号')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: '+25g', exact: true }).click()
  await expect(page.locator('.protein-ring strong')).toHaveText('35')
  await context.clearCookies()
  await context.setOffline(false)
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  const cache = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('tm_account_cache_' + localStorage.getItem('tm_offline_user'))),
  )
  expect(cache.dirty).toBeTruthy()
  expect(Object.values(cache.data.protein).flatMap(Object.values)).toContain(35)
})
