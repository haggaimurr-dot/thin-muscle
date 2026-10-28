<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { api, demoMode } from '../api'
import { state } from '../store'
import { localBadges, nextBadge } from '../badges'
import Icon from './Icon.vue'
import BadgeMark from './BadgeMark.vue'
const remote = ref(null),
  error = ref(false)
let controller
async function load() {
  if (demoMode) return
  controller?.abort()
  controller = new AbortController()
  try {
    remote.value = await api('/badges', undefined, 'GET', controller.signal)
  } catch (e) {
    if (e.name !== 'AbortError') error.value = true
  }
}
onMounted(load)
watch(
  () => state.syncStatus,
  (status, previous) => {
    if (!demoMode && status === 'synced' && previous !== status) load()
  },
)
onBeforeUnmount(() => controller?.abort())
const data = computed(() => (demoMode ? localBadges(state, state.demoBadgeAwards) : remote.value))
const next = computed(() => nextBadge(data.value?.items || []))
</script>
<template>
  <section class="panel badge-dashboard">
    <div class="row">
      <BadgeMark v-if="next" :badge="next" small /><span v-else class="metric-icon green"
        ><Icon name="trophy"
      /></span>
      <div>
        <h2>你的成长徽章</h2>
        <p v-if="data">
          已获得 {{ data.earned_count }} 枚<span v-if="next">
            · 下一枚：{{ next.title }}（{{ Math.min(next.current, next.target) }}/{{
              next.target
            }}）</span
          >
        </p>
        <p v-else>{{ error ? '进入徽章馆查看进度' : '正在整理成长足迹…' }}</p>
      </div>
    </div>
    <RouterLink to="/badges" class="text-link"
      >进入徽章馆<Icon name="right" :size="15"
    /></RouterLink>
  </section>
</template>
