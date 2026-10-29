<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { demoMode } from '../api'
const props = defineProps({ id: String, revision: Number, name: String })
const src = ref('')
let controller
watch(
  () => [props.id, props.revision],
  async () => {
    controller?.abort()
    const request = (controller = new AbortController())
    if (src.value) URL.revokeObjectURL(src.value)
    src.value = ''
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || '/api/v1'}/foods/${props.id}/image`,
        {
          credentials: 'include',
          signal: request.signal,
          headers: demoMode ? { 'X-User-Id': '4' } : {},
        },
      )
      if (!response.ok) return
      const blob = await response.blob()
      if (!request.signal.aborted) src.value = URL.createObjectURL(blob)
    } catch {
      /* Leave unavailable images hidden. */
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  controller?.abort()
  if (src.value) URL.revokeObjectURL(src.value)
})
</script>
<template>
  <img v-if="src" :src="src" :alt="name + '的食品或热量信息图片'" class="user-food-image" />
</template>
<style scoped>
.user-food-image {
  width: 100%;
  height: 130px;
  object-fit: contain;
  border-radius: 10px;
  background: #f3f5ef;
}
</style>
