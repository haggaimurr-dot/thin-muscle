import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nutritionGoalAt, validateNutritionGoals } from '../src/nutrition-goals.js'
test('date goals preserve history and only become active from their date', () => {
  const a = { kcal: 1800, protein: 100, carb: 200, fat: 60 }
  const b = { ...a, protein: 120 }
  const goals = { '2026-10-01': a, '2026-11-01': b }
  validateNutritionGoals(goals)
  assert.equal(nutritionGoalAt(goals, '2026-09-30', 150).protein, 150)
  assert.equal(nutritionGoalAt(goals, '2026-10-31').protein, 100)
  assert.equal(nutritionGoalAt(goals, '2026-11-01').protein, 120)
  for (const invalid of [
    { '2026-02-30': a },
    { '2026-01-01': { ...a, fat: -1 } },
    { '2026-01-01': { ...a, protein: true } },
  ])
    assert.throws(() => validateNutritionGoals(invalid))
})
