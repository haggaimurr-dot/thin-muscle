import { reactive } from 'vue'
import { resetBadgeProfile, refreshBadgeProfile } from './badgeProfile'
import { api, setCsrf, demoMode } from './api'
import { connectSync, disconnectSync, state, flushSync, connectOffline } from './store'
export const auth = reactive({ ready: false, user: null, error: '', offline: false })
export async function initAuth() {
  if (demoMode) {
    auth.ready = true
    return
  }
  try {
    const data = await api('/auth/me')
    setCsrf(data.csrf)
    if (
      localStorage.getItem('tm_offline_user') &&
      localStorage.getItem('tm_offline_user') !== String(data.user.id)
    )
      localStorage.removeItem('tm_offline_user')
    auth.offline = false
    auth.user = data.user
    await connectSync(data.user.id)
    refreshBadgeProfile().catch(() => {})
  } catch (error) {
    const cachedId = localStorage.getItem('tm_offline_user')
    if (!navigator.onLine && cachedId && /^\d+$/.test(cachedId)) {
      try {
        connectOffline(Number(cachedId))
        auth.user = { id: Number(cachedId), nickname: '离线缓存' }
        auth.offline = true
      } catch (e) {
        auth.error = e.message
      }
    } else if (error.status === 401) {
      const wasOffline = auth.offline
      auth.user = null
      auth.offline = false
      disconnectSync()
      if (wasOffline) auth.error = '离线登录已失效，请重新登录；本机未同步记录已保留'
    } else auth.error = error.message
  } finally {
    auth.ready = true
  }
}
export async function signIn(credentials, register = false, endpoint = null) {
  const data = await api('/auth/' + (endpoint || (register ? 'register' : 'login')), credentials)
  resetBadgeProfile()
  setCsrf(data.csrf)
  if (
    localStorage.getItem('tm_offline_user') &&
    localStorage.getItem('tm_offline_user') !== String(data.user.id)
  )
    localStorage.removeItem('tm_offline_user')
  auth.offline = false
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
  localStorage.removeItem('tm_offline_user')
  setCsrf('')
  auth.user = null
  resetBadgeProfile()
  disconnectSync()
}
export function finishAccountAction(eraseCache = false) {
  let cleared = true
  localStorage.removeItem('tm_offline_user')
  if (eraseCache && auth.user) {
    try {
      localStorage.removeItem('tm_account_cache_' + auth.user.id)
      localStorage.removeItem('tm_auto_backup_' + auth.user.id)
      localStorage.removeItem('tm_auto_backup_enabled_' + auth.user.id)
    } catch {
      cleared = false
    }
  }
  setCsrf('')
  auth.user = null
  auth.error = ''
  disconnectSync()
  return cleared
}
window.addEventListener('session-expired', () => {
  auth.user = null
  setCsrf('')
  resetBadgeProfile()
  disconnectSync()
  auth.error = '登录已过期，请重新登录；待同步记录已保留在本机缓存'
})

window.addEventListener('online', () => {
  if (auth.offline) initAuth()
})
