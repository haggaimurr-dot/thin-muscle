<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './components/Icon.vue'
import Login from './components/Login.vue'
import AccountSecurity from './components/AccountSecurity.vue'
import AccountRecovery from './components/AccountRecovery.vue'
import SyncMerge from './components/SyncMerge.vue'
import { auth, initAuth, signOut } from './auth'
import { demoMode } from './api'
import { reloadCloud, retrySync } from './store'
import Modal from './components/Modal.vue'
import BadgeMark from './components/BadgeMark.vue'
import { featuredBadge } from './badgeProfile'
import { state, exportData, parseBackup, restoreBackup, notify, setTheme } from './store'
import { backupSummary } from './store'
const themeOpts = [
  { v: 'light', l: '浅' },
  { v: 'white', l: '白' },
  { v: 'black', l: '黑' },
]
onMounted(initAuth)
onMounted(() => {
  if (route.query.identity_bound === '1') {
    securityOpen.value = true
    notify('微信登录身份已绑定，请查看账号安全中的登录方式')
  }
})
const cloudConfirm = ref(false)
const mergeOpen = ref(false)
const securityOpen = ref(false)
function focusMain() {
  document.getElementById('main-content')?.focus()
}
function openSecurity() {
  securityOpen.value = true
  menuOpen.value = false
}
async function logout() {
  try {
    await signOut()
  } catch (error) {
    notify(error.message)
  }
}
async function loadRemote() {
  try {
    await reloadCloud()
    cloudConfirm.value = false
  } catch (error) {
    notify(error.message)
  }
}
const route = useRoute(),
  menuOpen = ref(false),
  backup = ref(null),
  backupInput = ref(null)
const nav = [
  ['/', 'dashboard', '训练总览'],
  ['/training', 'training', '我的训练'],
  ['/nutrition', 'nutrition', '饮食管理'],
  ['/community', 'community', '训练社区'],
  ['/market', 'market', '健身市场'],
  ['/tools', 'tools', '动作实验室'],
  ['/badges', 'trophy', '成长徽章'],
]
const date = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(
    new Date(),
  ),
)
async function selectBackup(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    notify('备份文件不能超过 5MB')
    return
  }
  try {
    backup.value = parseBackup(await file.text())
  } catch (error) {
    notify(error.message)
  }
}
function confirmRestore() {
  try {
    restoreBackup(backup.value)
    backup.value = null
  } catch (error) {
    notify(error.message)
  }
}
</script>
<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content" @click.prevent="focusMain">跳到主要内容</a>
    <aside class="sidebar" :class="{ open: menuOpen }">
      <RouterLink to="/" class="brand" @click="menuOpen = false"
        ><span class="brand-mark"><Icon name="training" :size="25" /></span
        ><span>薄肌<span class="brand-en">THIN MUSCLE</span></span></RouterLink
      >
      <div class="nav-caption">你的训练空间</div>
      <nav aria-label="主导航">
        <RouterLink
          v-for="[path, icon, label] in nav"
          :key="path"
          :to="path"
          class="nav-link"
          :class="{ selected: route.path === path }"
          @click="menuOpen = false"
          ><Icon :name="icon" /><span>{{ label }}</span
          ><span v-if="icon === 'tools'" class="nav-tag">AI</span></RouterLink
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="consistency">
          <span class="tiny-label">ONE DAY AT A TIME</span>
          <h3>每一次坚持，<br />都在塑造更好的你。</h3>
          <div class="mini-bars">
            <i v-for="n in 16" :key="n" :style="{ height: 12 + ((n * 17) % 45) + 'px' }"></i>
          </div>
          <span>专注过程，进步自会发生。</span>
        </div>
        <button class="nav-link" @click="exportData"><Icon name="download" />导出我的记录</button>
        <button class="nav-link" @click="backupInput.click()">
          <Icon name="upload" />导入我的记录
        </button>
        <input
          ref="backupInput"
          class="sr-only"
          type="file"
          accept="application/json,.json"
          aria-label="选择备份文件"
          @change="selectBackup"
        />
        <button v-if="auth.user" class="nav-link" @click="logout">
          <Icon name="logout" />退出登录
        </button>
        <button v-if="auth.user && !demoMode" class="nav-link" @click="openSecurity">
          账号安全
        </button>
        <div class="theme-switch">
          <span class="tiny-label">主题</span>
          <div class="theme-opts" role="group" aria-label="主题选择">
            <button
              v-for="o in themeOpts"
              :key="o.v"
              :class="{ on: state.theme === o.v }"
              @click="setTheme(o.v)"
            >
              {{ o.l }}
            </button>
          </div>
        </div>
        <div class="profile">
          <BadgeMark v-if="featuredBadge" :badge="featuredBadge" small /><span v-else class="avatar"
            >我</span
          >
          <div>
            <strong>我的训练空间</strong
            ><small>{{ demoMode ? '演示账号' : auth.user?.nickname || '尚未登录' }}</small>
          </div>
          <span class="online-dot"></span>
        </div>
      </div>
    </aside>
    <button
      v-if="menuOpen"
      class="sidebar-shade"
      aria-label="收起导航"
      @click="menuOpen = false"
    ></button>
    <div class="workspace">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-btn mobile-menu" aria-label="展开导航" @click="menuOpen = true">
            <Icon name="menu" /></button
          ><span>我的空间</span><Icon name="right" :size="14" /><strong>{{
            route.meta.title
          }}</strong>
        </div>
        <div class="topbar-right">
          <span class="date-label"><Icon name="calendar" :size="16" />{{ date }}</span
          ><RouterLink to="/training?view=history" class="icon-btn" aria-label="查看训练记录"
            ><Icon name="clock" /></RouterLink
          ><span class="avatar small">我</span>
        </div>
      </header>
      <main id="main-content" tabindex="-1">
        <div v-if="state.storageError" class="alert">
          浏览器存储已满或不可用，当前修改暂未保存，请先导出记录。
        </div>
        <p v-if="!auth.ready" class="loading-state">正在检查登录状态…</p>
        <AccountRecovery
          v-else-if="!demoMode && route.query.account_action"
          :key="String(route.fullPath)"
        />
        <Login v-else-if="!demoMode && !auth.user" />
        <template v-else>
          <div v-if="!demoMode" class="sync-banner" role="status">
            <span v-if="auth.offline">离线缓存，登录尚未验证</span>
            <span v-if="!state.networkOnline">当前离线，未同步修改保留本机</span>
            <span>{{
              {
                synced: '已同步到账号',
                pending: '正在等待同步…',
                saving: '正在保存到云端…',
                loading: '正在加载云端记录…',
                error: '同步失败，本机记录已保留',
                conflict: '发现多设备版本冲突',
              }[state.syncStatus]
            }}</span>
            <span v-if="state.syncError">{{ state.syncError }}</span>
            <span v-if="['error', 'conflict'].includes(state.syncStatus)"
              >本机修改时间：{{ state.localUpdatedAt || '未知' }}；云端更新时间：{{
                state.remoteUpdatedAt || '未知（旧记录或连接失败）'
              }}</span
            >
            <label class="tiny"
              ><input v-model="state.updateReminders" type="checkbox" />跨设备更新提醒</label
            >
            <button
              v-if="state.syncStatus === 'conflict'"
              class="text-link"
              @click="mergeOpen = true"
            >
              预览合并两端记录
            </button>
            <button
              v-if="state.syncStatus === 'error'"
              class="text-link"
              :disabled="!state.networkOnline"
              @click="retrySync"
            >
              重试同步本机修改
            </button>
            <button
              v-if="['error', 'conflict'].includes(state.syncStatus)"
              class="text-link"
              @click="exportData"
            >
              先导出本机备份
            </button>
            <button
              v-if="['error', 'conflict'].includes(state.syncStatus)"
              class="text-link"
              @click="cloudConfirm = true"
            >
              重新加载云端
            </button>
          </div>
          <section
            v-if="state.badgeNotice.length"
            class="badge-celebration"
            aria-live="polite"
            aria-label="新获得的徽章"
          >
            <div class="row">
              <BadgeMark :badge="state.badgeNotice[0]" small />
              <div>
                <h3>新的徽章，属于你的坚持</h3>
                <p>{{ state.badgeNotice.map((b) => b.title).join(' · ') }}</p>
              </div>
              <button class="icon-btn" aria-label="收下徽章鼓励" @click="state.badgeNotice = []">
                <Icon name="close" :size="17" />
              </button>
            </div>
            <RouterLink to="/badges" class="text-link" @click="state.badgeNotice = []"
              >查看我的徽章<Icon name="arrow" :size="14"
            /></RouterLink>
          </section>
          <RouterView v-if="state.syncStatus !== 'loading'" />
        </template>
      </main>
      <footer class="page-footer">
        <span>薄肌 THIN MUSCLE</span><span>比昨天，进步一点点。</span>
      </footer>
    </div>
    <nav class="mobile-nav" aria-label="手机导航">
      <RouterLink
        v-for="[path, icon, label] in nav.slice(0, 5)"
        :key="path"
        :to="path"
        :class="{ selected: route.path === path }"
        ><Icon :name="icon" :size="21" /><span>{{
          label
            .replace('训练总览', '总览')
            .replace('我的训练', '训练')
            .replace('饮食管理', '饮食')
            .replace('训练社区', '社区')
            .replace('健身市场', '市场')
        }}</span></RouterLink
      >
    </nav>
    <Modal v-if="backup" title="导入记录备份" @close="backup = null">
      <div class="info-box">
        <p>版本：{{ backupSummary(backup).version }}</p>
        <p>训练 {{ backupSummary(backup).logs }} 条；饮食 {{ backupSummary(backup).meals }} 条</p>
        <p>日期范围：{{ backupSummary(backup).first }} 至 {{ backupSummary(backup).last }}</p>
        <p>
          图片引用 {{ backupSummary(backup).photos }} 张，其中内嵌
          {{ backupSummary(backup).embedded }}
          张。云端图片ID仅为引用，跨账号或已删除的图片不能靠JSON恢复。
        </p>
      </div>
      <p>
        导入会替换这个浏览器中已有的训练、饮食、计划、评估记录和个人周期目标。旧版备份未包含目标时会恢复默认目标。建议先导出当前记录作为备份。
      </p>
      <div class="modal-actions">
        <button class="btn" @click="backup = null">取消</button
        ><button class="btn primary" @click="confirmRestore">确认替换并导入</button>
      </div>
    </Modal>
    <Modal v-if="securityOpen && auth.user" title="账号安全" @close="securityOpen = false"
      ><AccountSecurity @close="securityOpen = false"
    /></Modal>
    <SyncMerge v-if="mergeOpen" @close="mergeOpen = false" />
    <Modal v-if="cloudConfirm" title="重新加载云端记录？" @close="cloudConfirm = false"
      ><p>这会替换当前本机界面中的记录。请先导出本机备份，保留尚未同步的修改。</p>
      <div class="modal-actions">
        <button class="btn" @click="cloudConfirm = false">取消</button
        ><button class="btn primary" @click="loadRemote">确认加载云端</button>
      </div></Modal
    >
    <Transition name="toast"
      ><div v-if="state.toast" class="toast" role="status">
        <Icon name="success" :size="18" />{{ state.toast }}
      </div></Transition
    >
  </div>
</template>
