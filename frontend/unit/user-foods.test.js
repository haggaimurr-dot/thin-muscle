import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asCatalogFood } from '../src/user-foods.js'
import { sumFoods } from '../src/food-catalog.js'

test('user foods retain unknown nutrition metadata when used in a calorie combination', () => {
  const food = asCatalogFood({
    id: 'test',
    name: '零食',
    category: '糕饼点心类',
    kcal: 400,
    protein: null,
    carb: 65,
    fat: null,
    visibility: 'private',
    note: '标签数据',
  })
  assert.deepEqual(food.unknownMacros, ['protein', 'fat'])
  assert.equal(food.sourceId, 'test')
  assert.equal(food.userFood, true)
  assert.match(food.sourceLabel, /私有/)
  const total = sumFoods([{ food, quantity: 50, unit: 'g' }])
  assert.equal(total.kcal, 200)
  assert.equal(total.carb, 32.5)
})
