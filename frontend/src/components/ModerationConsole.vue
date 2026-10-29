<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
const enabled = ref(false),
  items = ref([]),
  error = ref(''),
  busy = ref(false)
async function load() {
  error.value = ''
  try {
    enabled.value = (await api('/moderation/capabilities')).admin
    if (enabled.value) items.value = (await api('/moderation/reports')).items
  } catch (e) {
    error.value = e.message
  }
}
onMounted(load)
async function review(r, hidden) {
  busy.value = true
  error.value = ''
  try {
    await api(`/moderation/${r.kind}/${r.target_id}/review`, { hidden })
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section v-if="enabled" class="panel" aria-label="内容审核管理">
    <h2>举报审核队列</h2>
    <p v-if="error" class="alert">{{ error }}</p>
    <button class="btn" :disabled="busy" @click="load">刷新审核队列</button>
    <p v-if="!items.length">暂无举报。</p>
    <article v-for="r in items" :key="r.id">
      <h3>举报#{{ r.id }} · {{ r.kind }}#{{ r.target_id }} · {{ r.status }}</h3>
      <p>{{ r.text }}</p>
      <p>举报原因：{{ r.reason }}</p>
      <button class="btn" :disabled="busy || r.status === 'deleted'" @click="review(r, true)">
        隐藏被举报内容</button
      ><button class="btn" :disabled="busy || r.status === 'deleted'" @click="review(r, false)">
        恢复被举报内容
      </button>
    </article>
  </section>
</template>
