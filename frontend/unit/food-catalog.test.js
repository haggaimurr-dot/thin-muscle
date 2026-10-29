import { test } from 'node:test'
import assert from 'node:assert/strict'
import { foods, findFoods, quickFoods, rowGrams, sumFoods } from '../src/food-catalog.js'

test('snapshot has traceable finite nutrition and searchable Chinese aliases', () => {
  assert.ok(foods.length > 2000)
  assert.equal(new Set(foods.map((f) => f.id)).size, foods.length)
  for (const food of foods) {
    for (const key of ['kcal', 'protein', 'carb', 'fat'])
      assert.ok(Number.isFinite(food[key]) && food[key] >= 0, `${food.id} ${key}`)
  }
  assert.ok(findFoods('馍').some((f) => f.id === 'R2400201'))
  assert.ok(findFoods('面包').some((f) => f.id === 'Q1000101'))
  assert.ok(findFoods('', '水果类').every((f) => f.category === '水果类'))
  assert.equal(quickFoods.length, 6)
  assert.ok(quickFoods.every(Boolean))
})

test('mixed household portions and weighed ingredients scale without intermediate rounding', () => {
  const rice = quickFoods[0],
    noodles = quickFoods[1]
  const rows = [
    { food: rice, unit: '碗', quantity: 0.5, unitGrams: 150 },
    { food: noodles, unit: 'g', quantity: 200, unitGrams: 250 },
  ]
  assert.equal(rowGrams(rows[0]), 75)
  const total = sumFoods(rows)
  assert.equal(total.kcal, rice.kcal * 0.75 + noodles.kcal * 2)
  assert.equal(total.protein, rice.protein * 0.75 + noodles.protein * 2)
  assert.equal(noodles.kcal, foods.find((f) => f.id === noodles.sourceId).kcal * 0.4)
  for (const quantity of ['', 0, -1, Infinity, NaN, 'wrong', 5001]) {
    assert.equal(rowGrams({ ...rows[1], quantity }), null)
  }
  assert.equal(rowGrams({ ...rows[0], unitGrams: '' }), null)
})
