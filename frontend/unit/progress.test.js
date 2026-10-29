import test from 'node:test'
import assert from 'node:assert/strict'
import { periodProgress, periodDays, goalFor, validateGoals } from '../src/progress.js'

test('cross-year weeks and February leap day use actual calendar dates', () => {
  const data = {
    done: { '2025-12-29': { 1: true, 3: true, 5: true, 2: true } },
    protein: { '2025-12-29': { 3: 149, 4: 150, 5: 155 }, '2024-02-26': { 4: 150 } },
  }
  assert.equal(periodProgress(data, '2025-12', '2026-10-28').total.strength, 2)
  const jan = periodProgress(data, '2026-01', '2026-10-28')
  assert.equal(jan.total.strength, 1)
  assert.equal(jan.total.proteinDays, 2)
  assert.equal(jan.rows[0].protein, 150)
  assert.equal(periodProgress(data, '2024-02', '2026-10-28').rows[28].proteinDays, 1)
  assert.equal(periodDays('2024'), 366)
  assert.equal(periodDays('2025-02'), 28)
})
test('ignore future records, malformed week keys, non-booleans and invalid day numbers', () => {
  const data = {
    done: { '2026-10-26': { 1: true, 3: 'true', 5: true }, '2026-10-27': { 1: true } },
    protein: { '2026-10-26': { 1: 150, 3: 149, 5: 200, 8: 300, 2: -1 }, bad: { 1: 200 } },
  }
  const result = periodProgress(data, '2026', '2026-10-28')
  assert.deepEqual(result.total, { strength: 1, proteinDays: 1, protein: 299 })
  assert.equal(
    result.rows.reduce((n, r) => n + r.strength, 0),
    result.total.strength,
  )
  assert.equal(
    result.rows.reduce((n, r) => n + r.proteinDays, 0),
    result.total.proteinDays,
  )
})
test('goals are period-scoped and reject non-integers or impossible targets', () => {
  assert.equal(goalFor({}, '2026-10').strength_days, 12)
  const goals = { '2026-10': { strength_days: 8, protein_days: 25 } }
  validateGoals(goals)
  assert.equal(goalFor(goals, '2026-11').strength_days, 12)
  assert.equal(goalFor(goals, '2026').strength_days, 156)
  for (const value of [0, -1, 29, 1.5, '12', true])
    assert.throws(() => validateGoals({ '2025-02': { strength_days: value, protein_days: 20 } }))
  assert.throws(() => validateGoals({ '2026-13': { strength_days: 1, protein_days: 1 } }))
})
