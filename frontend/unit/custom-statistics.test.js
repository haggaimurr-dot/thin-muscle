import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scheduledStrengthDays, periodProgress } from '../src/progress.js'
test('personal strength counts custom training days and excludes replaced recovery days', () => {
  const data = {
    done: { '2026-10-26': { 1: true, 2: true, 3: true } },
    plans: { '2026-10-26': { 1: { type: 'rest' }, 2: { type: 'push' }, 3: { type: 'rest' } } },
  }
  assert.deepEqual(scheduledStrengthDays(data, '2026-10-26'), [2, 5])
  assert.equal(periodProgress(data, '2026-10', '2026-10-29').total.strength, 1)
  assert.deepEqual(scheduledStrengthDays({}, '2026-10-26'), [1, 3, 5])
})
