<script setup>
import { computed, ref } from 'vue'
import { state, notify, ymd, monday } from '../store'
const emit = defineEmits(['use'])
const search = ref(''),
  period = ref('week'),
  anchor = ref(ymd())
const templates = computed(() =>
  (state.mealTemplates || []).filter((m) =>
    m.title?.toLowerCase().includes(search.value.toLowerCase().trim()),
  ),
)
function remove(id) {
  state.mealTemplates = state.mealTemplates.filter((m) => m.template_id !== id)
  notify('餐食模板已删除')
}
const rows = computed(() => {
  const end = new Date(anchor.value + 'T12:00:00')
  if (Number.isNaN(end.getTime())) return []
  const start =
    period.value === 'month'
      ? anchor.value.slice(0, 7) + '-01'
      : period.value === 'week'
        ? monday(end)
        : anchor.value
  const last = new Date(start + 'T12:00:00')
  last.setDate(last.getDate() + (period.value === 'week' ? 6 : 0))
  if (period.value === 'month') {
    last.setMonth(last.getMonth() + 1)
    last.setDate(0)
  }
  const out = new Map()
  for (const m of state.meals) {
    const date = m.date || ymd(new Date(m.created_at))
    if (!m.logged_to_protein || date < start || date > ymd(last) || date > ymd()) continue
    if (!out.has(date)) out.set(date, { date, kcal: 0, protein: 0, carb: 0, fat: 0 })
    const r = out.get(date)
    for (const [f, key] of [
      ['kcal', 'base_kcal'],
      ['protein', 'base_protein_g'],
      ['carb', 'base_carb_g'],
      ['fat', 'base_fat_g'],
    ])
      r[f] += Number(m[key] || 0) * Number(m.portion || 1)
  }
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date))
})
const totals = computed(() =>
  rows.value.reduce(
    (a, r) => ({
      kcal: a.kcal + r.kcal,
      protein: a.protein + r.protein,
      carb: a.carb + r.carb,
      fat: a.fat + r.fat,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  ),
)
</script>
<template>
  <section class="panel" aria-label="个人食物库与营养趋势">
    <h2>个人常用餐食</h2>
    <p class="tiny">模板来自你自己的饮食记录，每份营养可修改后计入；不会提交到公共食物库。</p>
    <label>搜索餐食模板<input v-model="search" type="search" /></label>
    <p v-if="!templates.length">暂无匹配模板，可在饮食记录中保存常用餐食。</p>
    <article v-for="m in templates" :key="m.template_id" class="row between wrap">
      <p>{{ m.title }} · 每份蛋白 {{ m.base_protein_g }}g</p>
      <button class="btn" @click="emit('use', m)">使用餐食模板</button
      ><button class="btn" @click="remove(m.template_id)">删除餐食模板</button>
    </article>
    <h3>营养摄入趋势</h3>
    <div class="row wrap">
      <label
        >营养趋势周期<select v-model="period">
          <option value="day">日</option>
          <option value="week">周</option>
          <option value="month">月</option>
        </select></label
      ><label>营养趋势日期<input v-model="anchor" type="date" /></label>
    </div>
    <p>
      已计入餐食合计：{{ Math.round(totals.kcal) }}kcal · 蛋白{{
        Math.round(totals.protein * 10) / 10
      }}g · 碳水{{ Math.round(totals.carb * 10) / 10 }}g · 脂肪{{
        Math.round(totals.fat * 10) / 10
      }}g
    </p>
    <p class="tiny">
      仅汇总已确认餐食，不含手动调整蛋白克数；未来记录不计。周一开始，月度按自然月。
    </p>
    <p v-if="!rows.length">该周期没有已计入餐食。</p>
    <div v-for="r in rows" :key="r.date">
      <p>
        {{ r.date }} · {{ Math.round(r.kcal) }}kcal · 蛋白{{ Math.round(r.protein * 10) / 10 }}g
      </p>
      <meter
        :value="r.kcal"
        :max="Math.max(1, ...rows.map((v) => v.kcal))"
        :aria-label="r.date + '热量趋势'"
      ></meter>
    </div>
  </section>
</template>
