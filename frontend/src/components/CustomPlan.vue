<script setup>
import { ref } from 'vue'
import { state, getPlan, recalculateDay, notify } from '../store'
const props = defineProps({ day: Number, week: String, seed: Object, session: String }),
  emit = defineEmits(['close'])
const draft = ref(JSON.parse(JSON.stringify(getPlan(props.day, props.week)))),
  error = ref(''),
  preview = ref(false)
if (props.seed && !draft.value[props.session || 'am'].some((e) => e.name === props.seed.name))
  draft.value[props.session || 'am'].push({ ...props.seed })
function add(session) {
  draft.value[session].push({ name: '', sets: 3, reps: '8', note: '' })
}
function validate() {
  if (!draft.value.label?.trim()) throw new Error('请填写计划名称')
  for (const session of ['am', 'pm']) {
    const names = new Set()
    for (const ex of draft.value[session]) {
      if (!ex.name?.trim() || !String(ex.sets).trim() || !String(ex.reps).trim())
        throw new Error('动作须填写名称、组数及次数/时长')
      if (names.has(ex.name.trim())) throw new Error('同一时段不能使用重复动作名称')
      names.add(ex.name.trim())
    }
  }
}
function review() {
  error.value = ''
  try {
    validate()
    preview.value = true
  } catch (e) {
    error.value = e.message
  }
}
function save() {
  error.value = ''
  try {
    validate()
    state.plans[props.week] ??= {}
    state.plans[props.week][props.day] = JSON.parse(JSON.stringify(draft.value))
    recalculateDay(props.day, props.week)
    notify('当日自定义计划已保存')
    emit('close')
  } catch (e) {
    error.value = e.message
  }
}
</script>
<template>
  <form class="form-stack" @submit.prevent="review">
    <p>
      仅修改 {{ week }} 这一周的周{{
        day
      }}，不自动循环到其他周。历史训练记录保持不变，同名动作已有勾选保留。个人总览及月年力量趋势按自定义日类型统计；公共榜单和徽章仍按既有周一、三、五规则，不自动改变排行。
    </p>
    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <template v-if="!preview"
      ><label>自定义计划名称<input v-model="draft.label" maxlength="128" required /></label
      ><label
        >训练日类型<select v-model="draft.type">
          <option value="push">推日</option>
          <option value="pull">拉日</option>
          <option value="legs">腿日</option>
          <option value="rest">恢复日</option>
        </select></label
      >
      <section v-for="session in ['am', 'pm']" :key="session">
        <h3>{{ session === 'am' ? '早训动作' : '晚训动作' }}</h3>
        <div v-for="(ex, i) in draft[session]" :key="i" class="form-stack">
          <label>动作名称<input v-model="ex.name" maxlength="128" required /></label>
          <div class="two-col">
            <label>动作组数<input v-model="ex.sets" maxlength="32" required /></label
            ><label>动作次数或时长<input v-model="ex.reps" maxlength="32" required /></label>
          </div>
          <label>动作说明<input v-model="ex.note" maxlength="500" /></label
          ><button type="button" class="btn" @click="draft[session].splice(i, 1)">
            移除此动作
          </button>
        </div>
        <button class="btn" type="button" @click="add(session)">
          {{ session === 'am' ? '添加早训动作' : '添加晚训动作' }}
        </button>
      </section>
      <button class="btn primary">预览自定义计划</button></template
    >
    <template v-else
      ><h3>{{ draft.label }}</h3>
      <div v-for="session in ['am', 'pm']" :key="session">
        <h4>{{ session }}</h4>
        <p v-for="(ex, i) in draft[session]" :key="i">
          {{ ex.name }} · {{ ex.sets }} × {{ ex.reps }}
        </p>
      </div>
      <button type="button" class="btn" @click="preview = false">返回编辑</button
      ><button type="button" class="btn primary" @click="save">确认保存自定义计划</button></template
    >
  </form>
</template>
