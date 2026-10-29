<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
const emit = defineEmits(['updated'])
const settings = ref(null),
  trend = ref(null),
  error = ref(''),
  busy = ref(false),
  dim = ref('strength'),
  period = ref('week')
async function load() {
  error.value = ''
  try {
    settings.value = await api('/home/rank-privacy')
    trend.value = await api(`/home/rank-trend?dim=${dim.value}&period=${period.value}`)
  } catch (e) {
    error.value = e.message
  }
}
onMounted(load)
async function save() {
  busy.value = true
  error.value = ''
  try {
    await api('/home/rank-privacy', settings.value, 'PUT')
    emit('updated')
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="panel" aria-label="排名隐私与个人趋势">
    <details>
      <summary>排名隐私与个人趋势</summary>
      <p v-if="error" class="alert">{{ error }}</p>
      <form v-if="settings" class="form-stack" @submit.prevent="save">
        <label><input v-model="settings.participate" type="checkbox" />参与公开榜与好友榜</label
        ><label><input v-model="settings.show_weight" type="checkbox" />在社区公开体重及分组</label>
        <p class="tiny">
          默认延续既有公开行为。退出后立即不出现在榜单，旧排名快照仍仅供本人查看；隐藏体重后不参加同体重小榜。其他人已保存的截图无法撤回。
        </p>
        <button class="btn" :disabled="busy">保存排行隐私</button>
      </form>
      <div class="row wrap">
        <label
          >排名趋势指标<select v-model="dim">
            <option value="strength">力量完成</option>
            <option value="overload">渐进超负荷</option>
            <option value="protein">蛋白达标</option>
            <option value="streak">连续训练</option>
            <option value="weight_class">同体重进步</option>
          </select></label
        ><label
          >排名趋势周期<select v-model="period">
            <option value="week">周榜</option>
            <option value="month">月榜</option>
          </select></label
        ><button class="btn" @click="load">读取本人排名趋势</button>
      </div>
      <p>{{ trend?.rule }}</p>
      <p v-if="trend && !trend.items.length">尚无历史快照，系统会从后续定时快照开始积累。</p>
      <div v-for="r in trend?.items || []" :key="r.date">
        <p>{{ r.date }} · 第{{ r.rank }}名 · 得分{{ r.score }}</p>
        <meter
          min="1"
          :max="Math.max(1, ...trend.items.map((v) => v.rank))"
          :value="r.rank"
          :aria-label="r.date + '排名'"
        ></meter>
      </div>
    </details>
  </section>
</template>
