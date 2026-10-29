import { test, expect } from '@playwright/test'
test.skip(!!process.env.AUTH_E2E, 'Local backup failure')
test('malformed nested records reject and mid-write storage failure keeps original data', async ({
  page,
}) => {
  await page.goto('/#/')
  const out = await page.evaluate(async () => {
    const { currentBackupData, parseBackup, restoreBackup, state } = await import('/src/store.js')
    const data = currentBackupData()
    const cases = [
      { ...data, tm_pro_g_v2: { '2026-10-26': { 1: -10 } } },
      { ...data, tm_done_v2: { '2026-10-26': null } },
      { ...data, tm_meal_hist_v1: [{ title: 123 }] },
      { ...data, tm_vue_plans: { '2026-10-26': { 1: { am: null, pm: [] } } } },
    ]
    const rejected = cases.map((d) => {
      try {
        parseBackup(JSON.stringify(d))
        return false
      } catch {
        return true
      }
    })
    const original = Storage.prototype.setItem
    const before = Object.fromEntries(
      Object.keys(data)
        .filter((k) => k !== '_version')
        .map((k) => [k, localStorage.getItem(k)]),
    )
    let failed = false,
      message = ''
    Storage.prototype.setItem = function (key, value) {
      if (key === 'tm_meal_hist_v1' && !failed) {
        failed = true
        throw new DOMException('Quota', 'QuotaExceededError')
      }
      return original.call(this, key, value)
    }
    try {
      restoreBackup({ ...data, tm_phase: 3 })
    } catch (e) {
      message = e.message
    } finally {
      Storage.prototype.setItem = original
    }
    return {
      rejected,
      message,
      phase: state.phase,
      unchanged: Object.entries(before).every(([k, v]) => localStorage.getItem(k) === v),
    }
  })
  expect(out.rejected).toEqual([true, true, true, true])
  expect(out.phase).toBe(1)
  expect(out.unchanged).toBeTruthy()
  expect(out.message).toContain('原记录已保留')
})
