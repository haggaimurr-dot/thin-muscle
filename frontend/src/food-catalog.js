import snapshot from './data/food-catalog.json' with { type: 'json' }

export const foodSource = snapshot
const overrides = {
  A0550601: { name: '米饭（熟）', aliases: '白饭 大米饭', unit: '碗', grams: 150 },
  R2400201: { name: '白馒头（熟）', aliases: '馍 馒头 白面馍', unit: '个', grams: 100 },
  Q1000101: { name: '吐司面包', aliases: '面包 土司 切片面包', unit: '片', grams: 30 },
  K0111101: { name: '水煮鸡蛋', aliases: '煮鸡蛋 鸡蛋', unit: '个', grams: 50 },
  L01021: { name: '全脂牛奶', aliases: '鲜奶 牛奶 纯牛奶', unit: '杯', grams: 250 },
  M2700101: { name: '橄榄油', aliases: '食用油 烹调油', unit: '茶匙', grams: 5 },
}
export const foods = snapshot.foods.map((food) => ({ ...food, ...overrides[food.id] }))
const dryNoodle = foods.find((f) => f.id === 'R2000101')
// Explicit recipe assumption: 40g dry noodles + 60g absorbed water per 100g cooked noodles.
foods.splice(1, 0, {
  ...dryNoodle,
  id: 'estimate-cooked-noodles',
  name: '水煮面条（熟，参考估算）',
  aliases: '一碗面 面条 熟面 清水面',
  category: '餐饮份量估算',
  unit: '碗',
  grams: 250,
  derived: true,
  sourceId: dryNoodle.id,
  description:
    '按干面煮后增重至2.5倍估算：每100g熟面含40g干面。只含面条，不含汤、浇头和额外用油；实际吸水量会影响结果。',
  ...Object.fromEntries(
    ['kcal', 'protein', 'carb', 'fat'].map((key) => [key, dryNoodle[key] * 0.4]),
  ),
})
export const quickFoods = [
  'A0550601',
  'estimate-cooked-noodles',
  'R2400201',
  'Q1000101',
  'K0111101',
  'L01021',
].map((id) => foods.find((f) => f.id === id))
export const categories = [...new Set(foods.map((f) => f.category))]
export function findFoods(query = '', category = '全部') {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return foods.filter((f) => {
    const text = `${f.name} ${f.originalName} ${f.aliases}`.toLowerCase()
    return (
      (category === '全部' || f.category === category) && words.every((word) => text.includes(word))
    )
  })
}
export function rowGrams(row) {
  const quantity = Number(row.quantity)
  const unitGrams = row.unit === 'g' ? 1 : Number(row.unitGrams)
  const grams = quantity * unitGrams
  return Number.isFinite(quantity) &&
    Number.isFinite(unitGrams) &&
    quantity > 0 &&
    unitGrams > 0 &&
    grams <= 5000
    ? grams
    : null
}
export function sumFoods(rows) {
  return rows.reduce(
    (total, row) => {
      const grams = rowGrams(row)
      if (grams === null) return total
      for (const key of ['kcal', 'protein', 'carb', 'fat'])
        total[key] += (row.food[key] * grams) / 100
      return total
    },
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  )
}
