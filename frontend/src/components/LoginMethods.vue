<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { api } from '../api'
const emit = defineEmits(['updated'])
const data = ref(null),
  error = ref(''),
  message = ref(''),
  busy = ref(false),
  target = ref(null)
const phone = ref(''),
  code = ref(''),
  username = ref(''),
  password = ref(''),
  seconds = ref(0)
const hasPassword = computed(() => data.value?.items.some((i) => i.kind === 'password'))
let timer
onBeforeUnmount(() => clearInterval(timer))
async function load() {
  try {
    data.value = await api('/auth/identities')
  } catch (e) {
    error.value = e.message
  }
}
onMounted(load)
async function act(kind) {
  if (busy.value) return
  error.value = ''
  message.value = ''
  busy.value = true
  try {
    if (kind === 'send') {
      if (!/^\+[1-9][0-9]{7,14}$/.test(phone.value))
        throw new Error('请输入含国家区号的手机号，例如 +8613800000000')
      await api('/auth/sms/send', { phone: phone.value })
      message.value = '验证码已发送'
      seconds.value = 60
      clearInterval(timer)
      timer = setInterval(() => {
        seconds.value--
        if (seconds.value <= 0) clearInterval(timer)
      }, 1000)
    } else {
      await api(
        '/auth/identities/' + kind,
        kind === 'sms'
          ? { phone: phone.value, code: code.value }
          : kind === 'password'
            ? { username: username.value, password: password.value }
            : { key: target.value.key },
      )
      message.value = kind === 'unlink' ? '已解绑；其他设备的旧会话已退出' : '登录方式已绑定'
      target.value = null
      code.value = ''
      password.value = ''
      await load()
      emit('updated')
    }
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function wechat(kind) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await api('/auth/identities/wechat/start', { kind })
    window.location.assign(result.url)
  } catch (e) {
    error.value = e.message
    busy.value = false
  }
}
</script>
<template>
  <section class="form-stack" aria-label="登录方式管理">
    <h3>登录方式管理</h3>
    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <p v-if="message" class="info-box" role="status">{{ message }}</p>
    <button v-if="!data" class="btn" @click="load">重新读取登录方式</button>
    <template v-else>
      <p class="tiny">
        绑定后可登录同一账号；已经属于其他账号的身份会被拒绝，不自动合并数据。始终保留至少一种登录方式。
      </p>
      <div v-for="item in data.items" :key="item.key" class="row between wrap">
        <span>{{ item.label }}</span>
        <button
          class="btn small-btn"
          :aria-label="'解绑' + item.label"
          :disabled="busy || data.items.length <= 1"
          @click="target = item"
        >
          解绑
        </button>
      </div>
      <div v-if="target" class="info-box">
        <p>
          确认解绑
          {{
            target.label
          }}？解绑后此方式不能再登录当前账号，其他设备会退出。请确认剩余登录方式可用。
        </p>
        <button class="btn" :disabled="busy" @click="target = null">取消解绑</button>
        <button class="btn destructive" :disabled="busy" @click="act('unlink')">确认解绑</button>
      </div>
      <form v-if="!hasPassword" class="form-stack" @submit.prevent="act('password')">
        <h3>绑定密码登录</h3>
        <label
          >新用户名<input
            v-model="username"
            required
            pattern="[A-Za-z0-9_]{3,32}"
            maxlength="32"
            autocomplete="username"
        /></label>
        <label
          >设置登录密码<input
            v-model="password"
            type="password"
            required
            minlength="10"
            maxlength="128"
            autocomplete="new-password"
        /></label>
        <button class="btn primary" :disabled="busy">绑定密码登录</button>
      </form>
      <form v-if="data.sms_available" class="form-stack" @submit.prevent="act('sms')">
        <h3>绑定手机号</h3>
        <label
          >绑定手机号<input
            v-model="phone"
            type="tel"
            required
            pattern="\+[1-9][0-9]{7,14}"
            placeholder="+8613800000000"
        /></label>
        <button type="button" class="btn" :disabled="busy || seconds > 0" @click="act('send')">
          {{ seconds > 0 ? seconds + ' 秒后重发' : '发送绑定验证码' }}
        </button>
        <label
          >绑定验证码<input v-model="code" inputmode="numeric" pattern="[0-9]{4,10}" required
        /></label>
        <button class="btn primary" :disabled="busy">验证并绑定手机号</button>
      </form>
      <p v-else class="tiny">短信渠道尚未配置，暂时不能绑定手机号。</p>
      <button v-if="data.wechat_web" class="btn" :disabled="busy" @click="wechat('web')">
        绑定微信扫码登录
      </button>
      <button v-if="data.wechat_browser" class="btn" :disabled="busy" @click="wechat('browser')">
        绑定微信内授权
      </button>
      <p v-if="!data.wechat_web && !data.wechat_browser" class="tiny">
        微信渠道尚未配置，暂时不能绑定微信。
      </p>
    </template>
  </section>
</template>
