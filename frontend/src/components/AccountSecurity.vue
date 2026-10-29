<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api'
import { finishAccountAction } from '../auth'
import { exportData, notify } from '../store'
import LoginMethods from './LoginMethods.vue'
const emit = defineEmits(['close'])
const status = ref(null),
  error = ref(''),
  message = ref(''),
  busy = ref(false)
const current = ref(''),
  password = ref(''),
  repeat = ref(''),
  email = ref(''),
  confirmation = ref('')
async function load() {
  error.value = ''
  try {
    status.value = await api('/auth/security')
  } catch (e) {
    error.value = e.message
  }
}
onMounted(load)
async function act(kind) {
  if (busy.value) return
  error.value = ''
  message.value = ''
  if (kind === 'change' && password.value !== repeat.value) {
    error.value = '两次新密码不一致'
    return
  }
  busy.value = true
  try {
    if (kind === 'email') {
      const data = await api('/auth/recovery-email', {
        current_password: current.value,
        email: email.value,
      })
      message.value = data.message
    } else {
      await api(
        kind === 'change' ? '/auth/password/change' : '/auth/account/delete',
        kind === 'change'
          ? { current_password: current.value, new_password: password.value }
          : { current_password: current.value, confirmation: confirmation.value },
      )
      const cleared = finishAccountAction(kind === 'delete')
      emit('close')
      notify(
        kind === 'change'
          ? '密码已修改，所有设备已退出，请重新登录'
          : cleared
            ? '账号已注销，私人记录已清除'
            : '账号已注销；本机缓存清理失败，请清理此站点数据',
      )
    }
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div class="form-stack">
    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <p v-if="message" class="info-box" role="status">{{ message }}</p>
    <button v-if="!status" class="btn" @click="load">重新读取安全设置</button>
    <template v-if="status">
      <LoginMethods @updated="load" />
      <p v-if="!status.has_password" class="info-box">
        当前账号未设置密码；跨登录方式绑定完成后才能使用密码安全设置。
      </p>
      <template v-else>
        <p>
          改密会使所有设备退出。注销会立即删除训练、饮食、图片、徽章、个人计划和社区内容；有作品或订单时会拒绝注销。注销没有冷静期。
        </p>
        <button class="btn" @click="exportData">先导出私人记录备份</button>
        <label
          >当前密码<input
            v-model="current"
            type="password"
            autocomplete="current-password"
            maxlength="128"
        /></label>
        <form class="form-stack" @submit.prevent="act('change')">
          <h3>修改密码</h3>
          <label
            >新密码<input
              v-model="password"
              type="password"
              autocomplete="new-password"
              minlength="10"
              maxlength="128"
              required
          /></label>
          <label
            >确认新密码<input
              v-model="repeat"
              type="password"
              autocomplete="new-password"
              minlength="10"
              maxlength="128"
              required
          /></label>
          <p class="tiny">
            密码须为 10–128 位。请先等待记录同步；未同步副本在改密后仍保留于本机，重新登录后可恢复。
          </p>
          <button class="btn primary" :disabled="busy || !current">修改密码并退出所有设备</button>
        </form>
        <form class="form-stack" @submit.prevent="act('email')">
          <h3>找回密码邮箱</h3>
          <p>
            {{
              status.recovery_email
                ? '已验证邮箱：' + status.recovery_email
                : '尚未绑定恢复邮箱。忘记密码前需先绑定并验证。'
            }}
          </p>
          <p v-if="!status.email_available" class="info-box">
            邮件服务尚未配置，暂时不能绑定邮箱或发送找回密码邮件。
          </p>
          <label
            >恢复邮箱<input
              v-model="email"
              type="email"
              autocomplete="email"
              maxlength="254"
              required
          /></label>
          <button class="btn" :disabled="busy || !current || !status.email_available">
            发送邮箱验证链接
          </button>
          <button type="button" class="text-link" :disabled="busy" @click="load">
            刷新邮箱验证状态
          </button>
        </form>
        <details>
          <summary>注销账号</summary>
          <form class="form-stack" @submit.prevent="act('delete')">
            <p class="alert">
              此操作无法恢复。注销会清除本机当前账号缓存和云端私人记录；其他设备的离线缓存与自行导出的备份需在对应设备手动清理。系统只保留不含个人资料的编号占位，防止旧缓存关联新账号。
            </p>
            <label
              >注销确认<input
                v-model="confirmation"
                autocomplete="off"
                placeholder="请输入：注销我的账号"
                required
            /></label>
            <button
              class="btn destructive"
              :disabled="busy || !current || confirmation !== '注销我的账号'"
            >
              永久注销账号并清除记录
            </button>
          </form>
        </details>
      </template>
    </template>
  </div>
</template>
