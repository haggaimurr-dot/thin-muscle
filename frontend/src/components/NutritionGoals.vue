<script setup>
import { computed, ref } from 'vue'
import { state, ymd, monday, notify } from '../store'
import { nutritionGoalAt, validateNutritionGoals, nutrientLimits } from '../nutrition-goals'
const date = ref(ymd()),
  effective = ref(ymd())
const draft = ref({ kcal: '', protein: '', carb: '', fat: '' })
const labels = { kcal: '热量（kcal）', protein: '蛋白（g）', carb: '碳水（g）', fat: '脂肪（g）' }
const current = computed(() =>
  nutritionGoalAt(state.nutritionGoals, date.value, state.proteinTarget),
)
const consumed = computed(() => {
  const total = { kcal: 0, protein: 0, carb: 0, fat: 0 }
  for (const m of state.meals) {
    if (!m.logged_to_protein || (m.date || ymd(new Date(m.created_at))) !== date.value) continue
    for (const key of Object.keys(total))
      total[key] +=
        Number(m[key === 'kcal' ? 'base_kcal' : `base_${key}_g`] || 0) * Number(m.portion || 1)
  }
  const d = new Date(date.value + 'T12:00:00')
  total.protein = Number(state.protein[monday(d)]?.[d.getDay() || 7] || 0)
  return total
})
const history = computed(() =>
  Object.entries(state.nutritionGoals).sort(([a], [b]) => b.localeCompare(a)),
)
function load() {
  const goal = current.value
  draft.value = Object.fromEntries(Object.keys(labels).map((k) => [k, goal[k] ?? '']))
  effective.value = date.value
}
function save() {
  try {
    const next = { ...state.nutritionGoals, [effective.value]: { ...draft.value } }
    validateNutritionGoals(next)
    state.nutritionGoals = next
    notify('营养目标已保存，按生效日期使用')
  } catch (e) {
    notify(e.message)
  }
}
</script>
<template>
  <section class="panel" aria-label="分日期营养目标">
    <h2>个人营养目标</h2>
    <p class="tiny">
      自行填写目标；此处不提供自动饮食建议。目标从生效日持续使用，直到下一次变更；修改相同生效日会替换该日版本。蛋白含手动调整，其余营养仅汇总已确认餐食。
    </p>
    <label
      >查看营养日期<input v-model="date" type="date" min="2000-01-01" max="2099-12-31"
    /></label>
    <p>当前目标生效日：{{ current.effective || '旧版默认（仅蛋白）' }}</p>
    <div v-for="(label, key) in labels" :key="key">
      <p>{{ label }}：{{ Math.round(consumed[key] * 10) / 10 }} / {{ current[key] ?? '未设置' }}</p>
      <progress
        v-if="current[key]"
        :value="Math.min(consumed[key], current[key])"
        :max="current[key]"
        :aria-label="label + '完成度'"
      />
    </div>
    <button class="btn" @click="load">将查看日目标填入表单</button>
    <form class="form-stack" @submit.prevent="save">
      <label
        >营养目标生效日期<input
          v-model="effective"
          type="date"
          min="2000-01-01"
          max="2099-12-31"
          required
      /></label>
      <label v-for="(label, key) in labels" :key="key"
        >目标{{ label
        }}<input
          v-model.number="draft[key]"
          type="number"
          min="1"
          :max="nutrientLimits[key]"
          step="1"
          required
      /></label>
      <button class="btn" type="submit">保存分日期营养目标</button>
    </form>
    <details>
      <summary>营养目标历史（{{ history.length }}）</summary>
      <p v-for="[day, goal] in history" :key="day">
        {{ day }} · {{ goal.kcal }}kcal / 蛋白{{ goal.protein }}g / 碳水{{ goal.carb }}g / 脂肪{{
          goal.fat
        }}g
      </p>
    </details>
  </section>
</template>
