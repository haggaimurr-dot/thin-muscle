<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { signIn, auth } from '../auth'
import { exportData } from '../store'
import { api } from '../api'
const transportSecure =
  location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
const mode = ref('password'),
  phone = ref(''),
  code = ref(''),
  sending = ref(false),
  capabilities = ref({})
onMounted(async () => {
  try {
    capabilities.value = await api('/auth/capabilities')
  } catch {}
})
async function sendCode() {
  if (!transportSecure) {
    error.value = '请使用 HTTPS 连接后再登录'
    return
  }
  sending.value = true
  error.value = ''
  try {
    await api('/auth/sms/send', { phone: phone.value })
  } catch (e) {
    error.value = e.message
  } finally {
    sending.value = false
  }
}
async function wechat(kind) {
  try {
    const data = await api('/auth/wechat/start?kind=' + kind)
    window.location.assign(data.url)
  } catch (e) {
    error.value = e.message
  }
}
const register = ref(false),
  username = ref(''),
  password = ref(''),
  busy = ref(false),
  error = ref('')
const fields = ref({})
const strength = computed(() => {
  const p = password.value
  if (!p) return '请输入密码：至少 10 位，最多 128 位'
  if (p.length < 10) return '长度不足：至少需要 10 位'
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(p)).length
  return `密码强度：${p.length >= 14 && kinds >= 3 ? '强' : kinds >= 2 ? '中' : '弱'}。建议混合大小写、数字和符号；复杂度仅作提示。`
})
watch([register, mode], () => {
  fields.value = {}
  error.value = ''
  auth.error = ''
})
watch(
  username,
  () => {
    delete fields.value.username
  },
  { flush: 'sync' },
)
watch(
  password,
  () => {
    delete fields.value.password
  },
  { flush: 'sync' },
)
async function showFields() {
  await nextTick()
  document.querySelector('.login-panel [aria-invalid="true"]')?.focus()
}
async function submit() {
  if (busy.value) return
  fields.value = {}
  error.value = ''
  auth.error = ''
  if (mode.value === 'password') {
    username.value = username.value.trim()
    if (!/^[A-Za-z0-9_]{3,32}$/.test(username.value))
      fields.value.username = '用户名须为 3–32 位字母、数字或下划线'
    if (password.value.length < 10 || password.value.length > 128)
      fields.value.password = '密码须为 10–128 位'
    if (Object.keys(fields.value).length) {
      await showFields()
      return
    }
  }
  if (!transportSecure) {
    error.value = '请使用 HTTPS 连接后再登录'
    return
  }
  busy.value = true
  error.value = ''
  auth.error = ''
  try {
    await (mode.value === 'sms'
      ? signIn({ phone: phone.value, code: code.value }, false, 'sms/login')
      : signIn({ username: username.value, password: password.value }, register.value))
  } catch (e) {
    if (mode.value === 'password' && register.value && e.status === 409) {
      fields.value.username = '用户名不可用，请更换后重试'
    } else if (Array.isArray(e.details)) {
      for (const detail of e.details) {
        const field = detail.loc?.at(-1)
        if (['username', 'password'].includes(field))
          fields.value[field] =
            field === 'username' ? '用户名须为 3–32 位字母、数字或下划线' : '密码须为 10–128 位'
      }
      if (!Object.keys(fields.value).length) error.value = e.message
    } else
      error.value =
        e.status === 401 && mode.value === 'password'
          ? '用户名或密码不正确，请检查后重试'
          : e.message
    await showFields()
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="panel login-panel">
    <div class="eyebrow">THIN MUSCLE ACCOUNT</div>
    <h1>{{ register ? '创建你的训练账号' : '欢迎回到薄肌' }}</h1>
    <p>登录后，训练和饮食记录可在手机与电脑间同步。</p>
    <div v-if="capabilities.sms" class="tabs">
      <button @click="mode = 'password'">密码登录</button
      ><button @click="mode = 'sms'">手机验证码</button>
    </div>
    <div v-if="!transportSecure" class="alert">
      正式登录需要 HTTPS。请使用配置好的安全网址访问。
    </div>
    <form class="form-stack" :novalidate="mode === 'password'" @submit.prevent="submit">
      <label v-if="mode === 'password'"
        >用户名<input
          v-model="username"
          aria-label="用户名"
          :aria-invalid="!!fields.username"
          aria-describedby="username-error"
          autocomplete="username"
          required
          pattern="[A-Za-z0-9_]{3,32}"
          minlength="3"
          maxlength="32"
          placeholder="3–32 位字母、数字或下划线"
        /><span id="username-error" v-if="fields.username" class="alert" role="alert">{{
          fields.username
        }}</span></label
      ><label v-if="mode === 'password'"
        >密码<input
          v-model="password"
          aria-label="密码"
          :aria-invalid="!!fields.password"
          :aria-describedby="register ? 'password-error password-strength' : 'password-error'"
          type="password"
          :autocomplete="register ? 'new-password' : 'current-password'"
          required
          minlength="10"
          maxlength="128"
          placeholder="至少 10 位"
        /><span id="password-error" v-if="fields.password" class="alert" role="alert">{{
          fields.password
        }}</span></label
      >
      <p
        v-if="mode === 'password' && register"
        id="password-strength"
        class="tiny"
        aria-live="polite"
      >
        {{ strength }}
      </p>
      <template v-if="mode === 'sms'"
        ><label
          >手机号<input
            v-model="phone"
            type="tel"
            required
            pattern="\+[1-9][0-9]{7,14}"
            placeholder="例如 +8613800000000" /></label
        ><button class="btn" type="button" :disabled="sending" @click="sendCode">发送验证码</button
        ><label
          >验证码<input v-model="code" required inputmode="numeric" pattern="[0-9]{4,10}" /></label
      ></template>
      <p v-if="error || auth.error" class="alert" role="alert">{{ error || auth.error }}</p>
      <button class="btn primary full" type="submit" :disabled="busy || !transportSecure">
        {{ busy ? '正在处理…' : register ? '注册并登录' : '登录' }}
      </button>
    </form>
    <RouterLink :to="{ path: '/', query: { account_action: 'forgot' } }" class="text-link centered"
      >忘记密码？通过恢复邮箱找回</RouterLink
    >
    <button
      v-if="mode === 'password'"
      class="text-link centered"
      @click="
        () => {
          register = !register
          error = ''
        }
      "
    >
      {{ register ? '已有账号？去登录' : '没有账号？创建账号' }}
    </button>
    <div class="info-box">
      首次使用账号前，可以先导出这台设备原来的记录，登录后再导入。账号不会自动接管演示账号的数据。
    </div>
    <button class="btn full" @click="exportData">导出原有本地记录</button>
    <button v-if="capabilities.wechat_web" class="btn full" @click="wechat('web')">
      微信扫码登录
    </button>
    <button v-if="capabilities.wechat_browser" class="btn full" @click="wechat('browser')">
      微信内授权登录
    </button>
    <p class="tiny centered">
      未显示的登录方式将在服务配置完成后开放。不同登录方式暂为独立账号；微信双端只有获得同一 UnionID
      时可合并。
    </p>
  </section>
</template>
