<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { finishAccountAction } from '../auth'
const route = useRoute(),
  router = useRouter()
const action = computed(() => route.query.account_action)
const username = ref(''),
  email = ref(''),
  password = ref(''),
  repeat = ref('')
const busy = ref(false),
  error = ref(''),
  message = ref(''),
  done = ref(false)
async function submit() {
  if (busy.value || done.value) return
  error.value = ''
  if (action.value === 'reset_password' && password.value !== repeat.value) {
    error.value = '两次新密码不一致'
    return
  }
  busy.value = true
  try {
    if (action.value === 'forgot') {
      const data = await api('/auth/password/forgot', {
        username: username.value.trim(),
        email: email.value,
      })
      message.value = data.message
    } else if (action.value === 'verify_email') {
      await api('/auth/recovery-email/verify', { token: route.query.token })
      message.value = '恢复邮箱验证成功，可返回账号安全设置查看。'
      done.value = true
    } else if (action.value === 'reset_password') {
      await api('/auth/password/reset', { token: route.query.token, new_password: password.value })
      finishAccountAction()
      message.value = '密码已重置，所有旧会话已失效，请使用新密码登录。'
      done.value = true
    } else error.value = '无效的账号操作链接'
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="panel login-panel">
    <h1>
      {{
        action === 'verify_email'
          ? '验证恢复邮箱'
          : action === 'reset_password'
            ? '设置新密码'
            : '找回密码'
      }}
    </h1>
    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <p v-if="message" class="info-box" role="status">{{ message }}</p>
    <form v-if="!done" class="form-stack" @submit.prevent="submit">
      <template v-if="action === 'forgot'">
        <p>输入用户名与此前绑定的已验证邮箱。未绑定邮箱的账号暂时无法通过邮件找回密码。</p>
        <label
          >用户名<input
            v-model="username"
            autocomplete="username"
            required
            pattern="[A-Za-z0-9_]{3,32}"
            maxlength="32"
        /></label>
        <label
          >恢复邮箱<input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            maxlength="254"
        /></label>
      </template>
      <template v-if="action === 'reset_password'">
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
      </template>
      <button class="btn primary" :disabled="busy">
        {{
          busy
            ? '正在处理…'
            : action === 'verify_email'
              ? '确认验证邮箱'
              : action === 'reset_password'
                ? '确认重置密码'
                : '发送重置链接'
        }}
      </button>
    </form>
    <button class="text-link" @click="router.replace({ path: '/', query: {} })">
      返回训练空间
    </button>
  </section>
</template>
