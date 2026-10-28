import { test, expect } from '@playwright/test'

test('desktop and mobile routes render without JS errors or horizontal overflow', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/training', '/nutrition', '/community', '/market', '/tools']) {
      await page.goto('/#' + path)
      await expect(page.locator('main h1')).toBeVisible()
      await expect(page.locator('main')).not.toContainText('Internal Server Error')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      expect(overflow, `${path} overflows at ${width}px`).toBe(false)
    }
  }
  expect(errors).toEqual([])
})

test('record, reload, edit and delete training; persist completion and phase', async ({ page }) => {
  await page.goto('/#/training')
  await page.getByRole('button', { name: 'W2', exact: true }).click()
  await page.locator('.week-picker button').first().click()
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('重量').fill('16')
  await dialog.getByLabel('次数 / 时长').fill('6')
  await dialog.getByRole('button', { name: '保存记录' }).click()
  await page.getByRole('button', { name: '完成本时段' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'W2', exact: true })).toHaveClass(/active/)
  await page.locator('.week-picker button').first().click()
  await expect(page.locator('.exercise-row input[type=checkbox]').first()).toBeChecked()
  await page.getByRole('button', { name: '训练记录', exact: true }).click()
  await expect(page.locator('.history-row')).toHaveCount(1)
  await page.getByRole('button', { name: '编辑记录', exact: true }).click()
  await dialog.getByLabel('重量').fill('18')
  await dialog.getByRole('button', { name: '保存记录' }).click()
  await expect(page.locator('.history-row')).toContainText('18')
  await page.getByRole('button', { name: '删除记录', exact: true }).click()
  await page.getByRole('button', { name: '确认删除', exact: true }).click()
  await expect(page.locator('.history-row')).toHaveCount(0)
})

test('protein tracking, meal demo, portions, undo and reload', async ({ page }) => {
  await page.goto('/#/nutrition')
  await page.getByRole('button', { name: '+25g', exact: true }).click()
  await expect(page.locator('.protein-ring strong')).toHaveText('25')
  await page.reload()
  await expect(page.locator('.protein-ring strong')).toHaveText('25')
  await page.getByRole('button', { name: '体验演示分析', exact: true }).click()
  await expect(page.locator('.meal-result')).toBeVisible()
  await page.locator('.meal-result select').selectOption('0.5')
  await page.getByRole('button', { name: '记入今日蛋白', exact: true }).click()
  await expect(page.locator('.protein-ring strong')).toHaveText('46')
  await page.getByRole('button', { name: '撤销计入', exact: true }).click()
  await expect(page.locator('.protein-ring strong')).toHaveText('25')
})

test('community live API, rank filtering, follow and unfollow', async ({ page }) => {
  await page.goto('/#/community')
  await page.getByRole('button', { name: '训练排行榜', exact: true }).click()
  await expect(page.locator('.ranking-row').first()).toBeVisible()
  await page.getByRole('button', { name: '本月', exact: true }).click()
  await page.getByRole('button', { name: '蛋白达标', exact: true }).click()
  await expect(page.locator('.ranking-row').first()).toBeVisible()
  await page.getByRole('button', { name: '发现伙伴', exact: true }).click()
  const card = page.locator('.person-card').first()
  await expect(card).toBeVisible()
  const before = await card.getByRole('button').innerText()
  await card.getByRole('button').click()
  await expect(card.getByRole('button')).not.toHaveText(before)
  await card.getByRole('button').click()
  await expect(card.getByRole('button')).toHaveText(before)
})

test('market filters, detail, consent, replication and assembly', async ({ page }) => {
  await page.goto('/#/market')
  await expect(page.locator('.product-card').first()).toBeVisible()
  await page.getByRole('button', { name: '训练方案', exact: true }).click()
  await expect(page.locator('.product-card').first()).toBeVisible()
  await page.locator('.product-card').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const checkout = page.getByRole('button', { name: /复刻到我的节点/ })
  if (await checkout.count()) {
    await checkout.click()
    const buy = page.getByRole('button', { name: /确认演示复刻/ })
    await expect(buy).toBeDisabled()
    await page.getByRole('dialog').getByRole('checkbox').nth(0).check()
    await page.getByRole('dialog').getByRole('checkbox').nth(1).check()
    await buy.click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  } else await page.getByRole('button', { name: '查看已复刻节点', exact: true }).click()
  await expect(page.locator('.node-card').first()).toBeVisible()
  await page.getByRole('button', { name: '拼入方案', exact: true }).first().click()
  await expect(page.locator('.compose-day').first()).toBeVisible()
  await page.getByRole('checkbox').nth(0).check()
  await page.getByRole('checkbox').nth(1).check()
  await page.getByRole('button', { name: '应用到本周训练', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('应用')
  await page.getByRole('link', { name: '查看我的每周计划', exact: true }).click()
  await expect(page.locator('main')).toContainText('每周计划')
})

test('AI demo writes report and video links reject unsafe schemes', async ({ page }) => {
  await page.goto('/#/tools')
  await page.getByRole('button', { name: '体验动作评估演示' }).click()
  await expect(page.locator('.assessment-score')).toContainText('78')
  await page.getByRole('button', { name: '将示范次数写入训练记录' }).click()
  await page.goto('/#/training?view=history')
  await expect(page.locator('.history-row')).toContainText('哑铃深蹲')
  await page.goto('/#/training')
  await page.locator('.week-picker button').first().click()
  await page.getByRole('button', { name: '板俯卧撑教学视频', exact: true }).click()
  await page.getByLabel('视频链接').fill('javascript:alert(1)')
  await page.getByRole('button', { name: '保存视频链接' }).click()
  await expect(page.getByRole('status')).toContainText('有效的 HTTP')
  await page.getByLabel('视频链接').fill('https://example.com/demo')
  await page.getByRole('button', { name: '保存视频链接' }).click()
  await expect(page.getByRole('dialog').getByRole('link').first()).toHaveAttribute(
    'href',
    'https://example.com/demo',
  )
})

test('existing local storage migrates without overwriting user data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'tm_pro_g_v2',
      JSON.stringify({
        [(() => {
          const d = new Date()
          d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })()]: { [new Date().getDay() || 7]: 151 },
      }),
    )
    localStorage.setItem('tm_phase', '3')
  })
  await page.goto('/#/nutrition')
  await expect(page.locator('.protein-ring strong')).toHaveText('151')
  await page.goto('/#/training')
  await expect(page.getByRole('button', { name: 'W3', exact: true })).toHaveClass(/active/)
})

test('mobile navigation, modal keyboard close and API failure retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/')
  await expect(page.locator('.sidebar')).not.toBeInViewport()
  await page.getByRole('button', { name: '展开导航' }).click()
  await expect(page.locator('.sidebar')).toBeInViewport()
  await page.locator('.sidebar').getByRole('link', { name: '动作实验室' }).click()
  await expect(page.locator('main h1')).toContainText('练漂亮')
  await expect(page.locator('.sidebar')).not.toBeInViewport()
  await page.locator('.mobile-nav').getByRole('link', { name: '训练', exact: true }).click()
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.route('**/api/v1/market/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: '测试网络失败' }),
    }),
  )
  await page.goto('/#/market')
  await expect(page.locator('.alert')).toContainText('测试网络失败')
  await page.unroute('**/api/v1/market/**')
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.locator('.product-card').first()).toBeVisible()
})

test('publish a plan with recorded loads and a lesson with media, then comment and like', async ({
  page,
}) => {
  await page.goto('/#/training')
  await page.locator('.week-picker button').first().click()
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  await page.getByRole('dialog').getByLabel('重量').fill('19')
  await page.getByRole('dialog').getByLabel('次数 / 时长').fill('7')
  await page.getByRole('button', { name: '保存记录', exact: true }).click()
  await page.goto('/#/market')
  await page.getByRole('button', { name: '发布作品', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('作品名称').fill('E2E 我的推拉腿')
  await dialog.getByRole('button', { name: '确认上架作品' }).click()
  await expect(dialog).toHaveCount(0)
  await page.locator('.product-card').filter({ hasText: 'E2E 我的推拉腿' }).click()
  await expect(page.getByRole('dialog')).toContainText('19')
  await expect(page.getByRole('dialog')).toContainText('7')
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '发布作品', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('作品类型').selectOption('lesson')
  await dialog.getByLabel('作品名称').fill('E2E 深蹲教学')
  await dialog.getByLabel('教学主题').fill('深蹲')
  await dialog.getByLabel('教学步骤').fill('核心收紧\n膝脚尖同向')
  await dialog.getByLabel('媒体链接').fill('https://example.com/squat.mp4')
  await dialog.getByRole('button', { name: '确认上架作品' }).click()
  await expect(dialog).toHaveCount(0)
  await page.locator('.product-card').filter({ hasText: 'E2E 深蹲教学' }).click()
  dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('核心收紧')
  await dialog.getByLabel('商品留言').fill('动作讲解很清楚')
  await dialog.getByRole('button', { name: '发送', exact: true }).click()
  await expect(dialog.locator('.comment-row')).toContainText('动作讲解很清楚')
  await dialog.getByRole('button', { name: /点赞/ }).click()
  await expect(dialog.getByRole('button', { name: /已赞/ })).toBeVisible()
})

test('editing a previous week keeps its original week and IDs work without secure-context randomUUID', async ({
  page,
}) => {
  await page.goto('/#/training?view=history')
  await page.evaluate(() => {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7)
    const w = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem(
      'tm_logs_v2',
      JSON.stringify({
        [w + '|1-am']: [
          { id: 'old-log', name: '哑铃卧推', weight: '16', sets: '3', reps: '6', rpe: '7' },
        ],
      }),
    )
  })
  await page.reload()
  await page.getByRole('button', { name: '编辑记录', exact: true }).click()
  await page.getByRole('dialog').getByLabel('重量').fill('21')
  await page.getByRole('button', { name: '保存记录', exact: true }).click()
  await page.reload()
  await expect(page.locator('.history-row')).toContainText('21')
  await page.addInitScript(() =>
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true }),
  )
  await page.goto('/#/training')
  await page.reload()
  await page
    .locator('.exercise-row')
    .first()
    .getByRole('button', { name: '记录', exact: true })
    .click()
  await page.getByRole('dialog').getByLabel('次数 / 时长').fill('5')
  await page.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '训练记录', exact: true }).click()
  await expect(page.locator('.history-row')).toHaveCount(2)
})

test('backup export restores records on another browser and rejects malformed files', async ({
  page,
  browser,
}) => {
  await page.goto('/#/nutrition')
  await page.getByRole('button', { name: '+25g', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出我的记录' }).click()
  const download = await downloadPromise
  const path = await download.path()
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const other = await context.newPage()
  await other.goto('/#/nutrition')
  await other.getByLabel('选择备份文件').setInputFiles(path)
  await expect(other.getByRole('dialog')).toContainText('替换')
  await other.getByRole('button', { name: '确认替换并导入' }).click()
  await expect(other.locator('.protein-ring strong')).toHaveText('25')
  await other.reload()
  await expect(other.locator('.protein-ring strong')).toHaveText('25')
  await other.getByLabel('选择备份文件').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"tm_phase": 100}'),
  })
  await expect(other.getByRole('status')).toContainText('训练阶段无效')
  await expect(other.locator('.protein-ring strong')).toHaveText('25')
  await context.close()
})
