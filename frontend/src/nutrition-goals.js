export const nutrientLimits = { kcal: 20000, protein: 1000, carb: 3000, fat: 2000 }
export function validateNutritionGoals(goals) {
  if (
    !goals ||
    typeof goals !== 'object' ||
    Array.isArray(goals) ||
    Object.keys(goals).length > 1500
  )
    throw new Error('营养目标格式错误或超过1500个日期')
  for (const [date, goal] of Object.entries(goals)) {
    const parsed = new Date(date + 'T00:00:00Z')
    if (
      !/^20\d{2}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    )
      throw new Error('营养目标生效日期无效')
    if (
      !goal ||
      typeof goal !== 'object' ||
      Object.keys(goal).sort().join() !== 'carb,fat,kcal,protein' ||
      Object.entries(nutrientLimits).some(
        ([key, max]) => !Number.isInteger(goal[key]) || goal[key] < 1 || goal[key] > max,
      )
    )
      throw new Error('营养目标须为范围内的正整数')
  }
}
export function nutritionGoalAt(goals, date, fallbackProtein = 150) {
  const effective = Object.keys(goals || {})
    .filter((d) => d <= date)
    .sort()
    .at(-1)
  return effective
    ? { ...goals[effective], effective }
    : { protein: fallbackProtein, kcal: null, carb: null, fat: null, effective: null }
}
