<script setup>
import { ref, onMounted } from 'vue'
import { api, demoMode } from '../api'
const config = ref(null),
  available = ref(false),
  deliveries = ref([]),
  error = ref(''),
  message = ref(''),
  busy = ref(false)
async function load() {
  if (demoMode) return
  try {
    const data = await api('/reminders')
    config.value = data.settings
    available.value = data.available
    deliveries.value = data.deliveries
  } catch (e) {
    error.value = e.message
  }
}
onMounted(load)
async function save() {
  busy.value = true
  error.value = ''
  try {
    await api('/reminders', config.value, 'PUT')
    message.value = '提醒设置已保存'
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section v-if="!demoMode" class="panel" aria-label="训练恢复提醒">
    <details>
      <summary>训练与恢复提醒</summary>
      <p v-if="error" class="alert">{{ error }}</p>
      <p v-if="message" role="status">{{ message }}</p>
      <template v-if="config"
        ><p>
          按你设置的星期和时间发送邮件；恢复提醒是手动日程，不根据身体状况自动判断。关闭浏览器不影响服务器邮件任务，服务器需持续运行。
        </p>
        <p v-if="!available" class="info-box">
          需要邮件服务配置和已验证的恢复邮箱；可在账号安全中验证邮箱。
        </p>
        <form class="form-stack" @submit.prevent="save">
          <label
            ><input
              v-model="config.enabled"
              type="checkbox"
              :disabled="!available"
            />同意接收训练及恢复提醒邮件</label
          ><label
            >提醒时区<input v-model="config.timezone" required placeholder="Asia/Shanghai" /></label
          ><label>训练提醒时间<input v-model="config.training_time" type="time" required /></label
          ><label>恢复提醒时间<input v-model="config.recovery_time" type="time" required /></label>
          <fieldset>
            <legend>训练提醒星期</legend>
            <label v-for="d in 7" :key="d"
              ><input v-model="config.training_days" type="checkbox" :value="d" />周{{ d }}</label
            >
          </fieldset>
          <fieldset>
            <legend>恢复提醒星期</legend>
            <label v-for="d in 7" :key="d"
              ><input v-model="config.recovery_days" type="checkbox" :value="d" />周{{ d }}</label
            >
          </fieldset>
          <button class="btn" :disabled="busy">保存提醒设置</button>
        </form>
        <p class="tiny">
          同日每类最多调度一次；启动后补发当天已到期项目，不补发往日。SMTP异常可能无法确定是否送达，不自动重发以免重复。
        </p>
        <p v-for="(r, i) in deliveries" :key="i">
          {{ r.day }} · {{ r.kind === 'training' ? '训练' : '恢复' }} · {{ r.status }}
        </p> </template
      ><button v-else class="btn" @click="load">重试加载提醒</button>
    </details>
  </section>
</template>
