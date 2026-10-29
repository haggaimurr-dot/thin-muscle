export function asCatalogFood(food) {
  const unknown = ['protein', 'carb', 'fat'].filter((key) => food[key] === null)
  return {
    id: `user-${food.id}`,
    name: food.name,
    category: food.category,
    description: food.note,
    kcal: food.kcal,
    protein: food.protein ?? 0,
    carb: food.carb ?? 0,
    fat: food.fat ?? 0,
    unknownMacros: unknown,
    userFood: true,
    sourceLabel: `用户自建食品，${food.visibility === 'private' ? '私有' : '公开'}；用户填写的热量，AI仅辅助分类`,
    sourceId: food.id,
  }
}
