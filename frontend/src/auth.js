import { reactive } from 'vue'
import { resetBadgeProfile, refreshBadgeProfile } from './badgeProfile'
import { api, setCsrf, demoMode } from './api'
import { connectSync, disconnectSync, state, flushSync } from './store'
export const auth = reactive({ ready: false, user: null, error: '' })
export async function initAuth() {
  if (demoMode) {
    auth.ready = true
    return
  }
  try {
    const data = await api('/auth/me')
    setCsrf(data.csrf)
    auth.user = data.user
    await connectSync(data.user.id)
    refreshBadgeProfile().catch(() => {})
  } catch (error) {
    if (error.status !== 401) auth.error = error.message
  } finally {
    auth.ready = true
  }
}
export async function signIn(credentials, register = false, endpoint = null) {
  const data = await api('/auth/' + (endpoint || (register ? 'register' : 'login')), credentials)
  resetBadgeProfile()
  setCsrf(data.csrf)
  auth.user = data.user
  await connectSync(data.user.id)
  refreshBadgeProfile().catch(() => {})
}
export async function signOut() {
  if (['pending', 'saving'].includes(state.syncStatus)) {
    await flushSync()
    if (state.syncStatus !== 'synced') throw new Error('记录尚未同步，请等待同步完成或先导出备份')
  }
  if (['conflict', 'error'].includes(state.syncStatus))
    throw new Error('请先导出本机备份并解决同步问题后退出')
  await api('/auth/logout', {})
  setCsrf('')
  auth.user = null
  resetBadgeProfile()
  disconnectSync()
}
window.addEventListener('session-expired', () => {
  auth.user = null
  setCsrf('')
  resetBadgeProfile()
  disconnectSync()
  auth.error = '登录已过期，请重新登录；待同步记录已保留在本机缓存'
})
