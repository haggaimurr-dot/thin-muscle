<script setup>
import { computed, ref, watch } from 'vue'
import { state, ymd, notify } from '../store'
import { goalFor, periodDays, periodProgress, validateGoals } from '../progress'
const mode = ref('month'),
  selected = ref(ymd().slice(0, 7)),
  error = ref('')
const valid = computed(() => {
  try {
    periodDays(selected.value)
    return selected.value.length === (mode.value === 'month' ? 7 : 4)
  } catch {
    return false
  }
})
const stats = computed(() => (valid.value ? periodProgress(state, selected.value, ymd()) : null))
const goal = computed(() => goalFor(state.goals, selected.value))
const strength = ref(12),
  protein = ref(20)
watch(mode, (value) => {
  selected.value =
    value === 'year'
      ? selected.value.slice(0, 4)
      : selected.value.slice(0, 4) + '-' + ymd().slice(5, 7)
})
watch(
  [selected, () => state.goals],
  () => {
    strength.value = goal.value.strength_days
    protein.value = goal.value.protein_days
    error.value = ''
  },
  { immediate: true, deep: true },
)
function save() {
  error.value = ''
  try {
    if (!valid.value) throw new Error('请选择有效统计周期')
    const next = { strength_days: Number(strength.value), protein_days: Number(protein.value) }
    validateGoals({ [selected.value]: next })
    state.goals[selected.value] = next
    if (state.storageError) throw new Error('本机存储失败，请导出备份后重试')
    notify('本周期目标已保存；登录账号将自动同步')
  } catch (e) {
    error.value = e.message
  }
}
</script>
<template>
  <section class="panel trend-panel" aria-label="长期趋势与个人目标">
    <div class="section-heading"><h2>月度与年度进步</h2></div>
    <div class="row wrap">
      <label
        >统计周期<select v-model="mode">
          <option value="month">月度</option>
          <option value="year">年度</option>
        </select></label
      >
      <label v-if="mode === 'month'"
        >统计月份<input v-model="selected" type="month" min="2000-01" max="2099-12"
      /></label>
      <label v-else
        >统计年份<input
          :value="selected"
          @input="selected = String($event.target.value)"
          type="number"
          min="2000"
          max="2099"
          step="1"
      /></label>
    </div>
    <p class="tiny">
      按记录实际日期归入自然月/年，仅统计截至今天的数据。力量天数沿用默认周一、三、五（自定义日期按力量日类型）完成标记，蛋白累计≥150g为达标；未记录日期计0。
    </p>
    <p v-if="!valid" class="alert">请选择2000–2099年的有效周期。</p>
    <template v-if="stats">
      <div class="two-col">
        <div>
          <h3>力量训练 {{ stats.total.strength }} / {{ goal.strength_days }} 天</h3>
          <progress
            :value="Math.min(stats.total.strength, goal.strength_days)"
            :max="goal.strength_days"
            aria-label="力量训练目标进度"
          ></progress>
          <p>{{ Math.round((stats.total.strength / goal.strength_days) * 100) }}% 完成</p>
        </div>
        <div>
          <h3>蛋白达标 {{ stats.total.proteinDays }} / {{ goal.protein_days }} 天</h3>
          <progress
            :value="Math.min(stats.total.proteinDays, goal.protein_days)"
            :max="goal.protein_days"
            aria-label="蛋白达标目标进度"
          ></progress>
          <p>{{ Math.round((stats.total.proteinDays / goal.protein_days) * 100) }}% 完成</p>
        </div>
      </div>
      <p v-if="!stats.details.length" class="info-box">
        本周期还没有完成或蛋白记录。记录训练与饮食后，这里会显示趋势。
      </p>
      <div
        class="trend-bars"
        role="img"
        :aria-label="selected + '训练及蛋白达标趋势；精确数据见下方表格'"
      >
        <div v-for="row in stats.rows" :key="row.label" class="trend-bar">
          <div class="trend-track">
            <i :style="{ height: (row.strength / (mode === 'month' ? 1 : 31)) * 100 + '%' }"></i
            ><b
              :style="{ height: (row.proteinDays / (mode === 'month' ? 1 : 31)) * 100 + '%' }"
            ></b>
          </div>
          <small>{{ Number(row.label.slice(-2)) }}</small>
        </div>
      </div>
      <p class="tiny">
        绿色：力量完成天数；蓝色：蛋白达标天数。横轴为{{
          mode === 'month' ? '日' : '月'
        }}，纵轴上限{{ mode === 'month' ? '1' : '31' }}天。
      </p>
      <details>
        <summary>查看统计明细</summary>
        <div class="trend-table">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>力量天数</th>
                <th>蛋白达标天数</th>
                <th>蛋白累计(g)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in stats.rows" :key="row.label">
                <td>{{ row.label }}</td>
                <td>{{ row.strength }}</td>
                <td>{{ row.proteinDays }}</td>
                <td>{{ Number(row.protein.toFixed(1)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
      <form class="form-stack" @submit.prevent="save">
        <h3>设置 {{ selected }} 的个人目标</h3>
        <p class="tiny">
          目标立即用于所选整个周期，包含该周期已有记录；月、年目标独立，其他周期不受影响。默认月目标12/20天，年目标156/240天；这是可调整的记录目标。
        </p>
        <div class="two-col">
          <label
            >力量训练目标天数<input
              v-model.number="strength"
              type="number"
              min="1"
              :max="periodDays(selected)"
              step="1"
              required /></label
          ><label
            >蛋白达标目标天数<input
              v-model.number="protein"
              type="number"
              min="1"
              :max="periodDays(selected)"
              step="1"
              required
          /></label>
        </div>
        <p v-if="error" class="alert" role="alert">{{ error }}</p>
        <button class="btn primary" type="submit">保存本周期目标</button>
      </form>
    </template>
  </section>
</template>
<style scoped>
.trend-panel {
  margin: 24px 0;
}
.trend-bars {
  display: flex;
  gap: 3px;
  height: 110px;
  margin-top: 20px;
}
.trend-bar {
  flex: 1;
  min-width: 0;
  text-align: center;
}
.trend-bar small {
  font-size: 9px;
}
.trend-track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1px;
  height: 80px;
  background: #f2f5f3;
}
.trend-track i,
.trend-track b {
  width: 40%;
  background: #2d8058;
}
.trend-track b {
  background: #457ab5;
}
.trend-table {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 8px;
  text-align: left;
  white-space: nowrap;
}
progress {
  max-width: 100%;
}
</style>
