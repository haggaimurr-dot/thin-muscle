<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { auth } from '../auth'
import { demoMode } from '../api'
const install = ref(null),
  update = ref(null)
const allowed = ref(localStorage.getItem('tm_offline_user') === String(auth.user?.id))
function change() {
  if (allowed.value && auth.user) localStorage.setItem('tm_offline_user', String(auth.user.id))
  else localStorage.removeItem('tm_offline_user')
}
function prompt(event) {
  event.preventDefault()
  install.value = event
}
function ready(event) {
  update.value = event.detail
}
async function doInstall() {
  await install.value?.prompt()
  install.value = null
}
function applyUpdate() {
  update.value?.postMessage({ type: 'ACTIVATE_UPDATE' })
  update.value = null
}
onMounted(() => {
  window.addEventListener('beforeinstallprompt', prompt)
  window.addEventListener('pwa-update', ready)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', prompt)
  window.removeEventListener('pwa-update', ready)
})
</script>
<template>
  <section class="panel" aria-label="离线与安装设置">
    <h2>离线与安装</h2>
    <p>
      首次联网打开正式构建后可缓存页面。离线训练与饮食编辑保留本机；恢复网络后验证登录并同步，版本冲突仍需处理。社区、支付、图片上传需要联网。
    </p>
    <label v-if="!demoMode"
      ><input
        v-model="allowed"
        type="checkbox"
        @change="change"
      />允许此浏览器离线打开我的记录</label
    >
    <p class="tiny">
      此设置使用当前浏览器的账号缓存；退出登录后关闭离线入口。共用设备请勿开启。浏览器清理数据会删除本机副本。
    </p>
    <button v-if="install" class="btn" @click="doInstall">安装薄肌俱乐部</button>
    <p v-else class="tiny">安装入口以浏览器菜单为准；需要 HTTPS 或本机开发地址。</p>
    <button v-if="update" class="btn" @click="applyUpdate">已保留本机记录，加载新版本</button>
  </section>
</template>
