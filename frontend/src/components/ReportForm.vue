<script setup>
import { ref } from 'vue'
import { api } from '../api'
const props = defineProps({ kind: String, targetId: Number }),
  emit = defineEmits(['close'])
const reason = ref(''),
  error = ref(''),
  busy = ref(false),
  receipt = ref(null)
async function send() {
  busy.value = true
  error.value = ''
  try {
    receipt.value = await api('/moderation/reports', {
      kind: props.kind,
      target_id: props.targetId,
      reason: reason.value,
    })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div>
    <p v-if="error" role="alert" class="alert">{{ error }}</p>
    <p v-if="receipt" class="info-box" role="status">
      举报已受理，编号{{ receipt.id }}，状态{{ receipt.status }}。重复举报不会重复建单。
    </p>
    <form v-else class="form-stack" @submit.prevent="send">
      <label>举报原因<textarea v-model="reason" required maxlength="500" /></label
      ><button class="btn primary" :disabled="busy || !reason.trim()">提交举报</button>
    </form>
    <button class="btn" @click="emit('close')">完成</button>
  </div>
</template>
