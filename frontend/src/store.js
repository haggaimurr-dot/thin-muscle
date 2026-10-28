import { reactive, computed, watch } from 'vue'
import { PLAN } from './data'
import { api, demoMode } from './api'
import { catalog, badgeMetrics } from './badges'
export function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}
export function ymd(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function monday(d = new Date()) {
  const day = new Date(d)
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return ymd(day)
}
export const week = monday()
export const today = new Date().getDay() || 7
export const state = reactive({
  phase: read('tm_phase', 1),
  logs: read('tm_logs_v2', {}),
  done: read('tm_done_v2', {}),
  protein: read('tm_pro_g_v2', {}),
  hits: read('tm_pro_hits_v2', {}),
  checks: read('tm_ex_checks_v2', {}),
  videos: read('tm_video_bind_v1', {}),
  meals: read('tm_meal_hist_v1', []),
  ai: read('tm_ai_hist_v1', []),
  plans: read('tm_vue_plans', {}),
  toast: '',
  storageError: false,
  badgeNotice: [],
  demoBadgeAwards: read('tm_demo_badges', {}),
  syncStatus: 'offline',
  syncError: '',
})
const keys = {
  phase: 'tm_phase',
  logs: 'tm_logs_v2',
  done: 'tm_done_v2',
  protein: 'tm_pro_g_v2',
  hits: 'tm_pro_hits_v2',
  checks: 'tm_ex_checks_v2',
  videos: 'tm_video_bind_v1',
  meals: 'tm_meal_hist_v1',
  ai: 'tm_ai_hist_v1',
  plans: 'tm_vue_plans',
}
let syncUser = null
let syncing = false
let revision = 0
let syncTimer
let syncEpoch = 0
let sending = false
let changed = 0
function snapshot() {
  return Object.fromEntries(
    Object.keys(keys).map((field) => [field, JSON.parse(JSON.stringify(state[field]))]),
  )
}
function cacheKey() {
  return 'tm_account_cache_' + syncUser
}
function saveCache(dirty) {
  localStorage.setItem(cacheKey(), JSON.stringify({ revision, data: snapshot(), dirty }))
}
for (const [field, key] of Object.entries(keys))
  watch(
    () => state[field],
    (value) => {
      try {
        if (syncing) return
        if (!syncUser) localStorage.setItem(key, JSON.stringify(value))
        else {
          changed++
          saveCache(true)
          if (state.syncStatus !== 'conflict') {
            state.syncStatus = 'pending'
            clearTimeout(syncTimer)
            syncTimer = setTimeout(flushSync, 800)
          }
        }
        state.storageError = false
      } catch {
        state.storageError = true
      }
    },
    { deep: true, flush: 'sync' },
  )
let toastTimer
export function notify(message) {
  state.toast = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (state.toast = ''), 4000)
}
export function getPlan(day) {
  const custom = state.plans[week]?.[day]
  if (custom) return custom
  const plan = PLAN[day]
  return {
    ...plan,
    pm: plan.pm.map((ex) => ({
      ...ex,
      sets:
        state.phase > 1 && !ex.noSets && !ex.timed && (ex.sets === 3 || ex.sets === '3–4')
          ? 4
          : ex.sets,
    })),
  }
}
export function sessionKey(day, session, w = week) {
  return `${w}|${day}-${session}`
}
export function isChecked(day, session, name) {
  return !!state.checks[week]?.[`${day}-${session}::${name}`]
}
export function toggleCheck(day, session, name, value) {
  state.checks[week] ??= {}
  state.checks[week][`${day}-${session}::${name}`] = value
  state.done[week] ??= {}
  recalculateDay(day)
}
export function recalculateDay(day) {
  state.done[week] ??= {}
  const plan = getPlan(day)
  state.done[week][day] =
    plan.am.length + plan.pm.length > 0 &&
    ['am', 'pm'].every((s) => plan[s].every((ex) => isChecked(day, s, ex.name)))
}
export const proteinToday = computed(() => Number(state.protein[week]?.[today] || 0))
export function changeProtein(delta, day = today, w = week) {
  state.protein[w] ??= {}
  state.hits[w] ??= {}
  const next = Math.max(0, Number(state.protein[w][day] || 0) + delta)
  state.protein[w][day] = Math.round(next * 10) / 10
  state.hits[w][day] = next >= 150
}
export const strengthDone = computed(
  () => [1, 3, 5].filter((day) => state.done[week]?.[day]).length,
)
export const proteinDays = computed(
  () => Object.values(state.protein[week] || {}).filter((g) => g >= 150).length,
)
export const overload = computed(() => {
  const prev = new Date(week + 'T12:00:00')
  prev.setDate(prev.getDate() - 7)
  const prevWeek = ymd(prev)
  const best = (w) => {
    const out = {}
    for (const [key, entries] of Object.entries(state.logs))
      if (key.startsWith(w + '|'))
        for (const e of entries) {
          const load = parseFloat(e.weight)
          const reps = parseFloat(e.reps)
          if (!Number.isFinite(load) || !Number.isFinite(reps)) continue
          if (
            !out[e.name] ||
            load > out[e.name].load ||
            (load === out[e.name].load && reps > out[e.name].reps)
          )
            out[e.name] = { load, reps }
        }
    return out
  }
  const current = best(week),
    previous = best(prevWeek)
  return Object.entries(current).filter(
    ([name, v]) =>
      previous[name] &&
      (v.load > previous[name].load ||
        (v.load === previous[name].load && v.reps > previous[name].reps)),
  ).length
})
export const streak = computed(() => {
  let count = 0
  const d = new Date(week + 'T12:00:00')
  while (count < 520) {
    const w = ymd(d)
    if ([1, 3, 5].filter((day) => state.done[w]?.[day]).length < 2) break
    count++
    d.setDate(d.getDate() - 7)
  }
  return count
})
export function uid() {
  return (
    globalThis.crypto?.randomUUID?.() || `tm-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}
export function saveLog(day, session, entry, editId, w = week) {
  const key = sessionKey(day, session, w)
  state.logs[key] ??= []
  if (editId) {
    const i = state.logs[key].findIndex((x) => x.id === editId)
    if (i >= 0) state.logs[key][i] = { ...state.logs[key][i], ...entry, id: editId }
  } else
    state.logs[key].push({
      ...entry,
      id: uid(),
      at: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    })
  notify('训练记录已保存')
}
export function exportData() {
  const data = Object.fromEntries(Object.entries(keys).map(([field, key]) => [key, state[field]]))
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `thin-muscle-${ymd()}.json`
  a.click()
  URL.revokeObjectURL(url)
  notify('记录已导出')
}

// A backup is restored only after the user reviews the replacement warning.
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON 备份')
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('备份格式无效')
  for (const [field, key] of Object.entries(keys)) {
    if (!Object.hasOwn(data, key)) throw new Error('备份不完整，缺少 ' + key)
    const value = data[key]
    if (field === 'phase') {
      if (!Number.isInteger(value) || value < 1 || value > 4) throw new Error('训练阶段无效')
    } else if (['meals', 'ai'].includes(field)) {
      if (
        !Array.isArray(value) ||
        value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))
      )
        throw new Error('备份中的列表格式无效：' + key)
    } else if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('备份中的记录格式无效：' + key)
    }
  }
  for (const entries of Object.values(data.tm_logs_v2)) {
    if (
      !Array.isArray(entries) ||
      entries.some((entry) => !entry || typeof entry !== 'object' || typeof entry.name !== 'string')
    )
      throw new Error('训练记录格式无效')
  }
  return data
}
export function restoreBackup(data) {
  // Check storage capacity before updating any reactive values.
  const probe = '__thin_muscle_restore_probe__'
  try {
    localStorage.setItem(probe, JSON.stringify(data))
    localStorage.removeItem(probe)
  } catch {
    throw new Error('浏览器存储空间不足，请先释放空间')
  }
  for (const [field, key] of Object.entries(keys)) state[field] = data[key]
  notify('备份已导入')
}

function applyData(data) {
  syncing = true
  for (const field of Object.keys(keys)) state[field] = data[field]
  syncing = false
}
export async function connectSync(userId) {
  syncUser = userId
  revision = 0
  changed = 0
  const epoch = ++syncEpoch
  clearTimeout(syncTimer)
  state.syncStatus = 'loading'
  state.syncError = ''
  try {
    const remote = await api('/data')
    if (epoch !== syncEpoch) return
    const cached = read(cacheKey(), null)
    revision = remote.revision
    const empty = {
      phase: 1,
      logs: {},
      done: {},
      protein: {},
      hits: {},
      checks: {},
      videos: {},
      meals: [],
      ai: [],
      plans: {},
    }
    if (cached?.dirty) {
      applyData(cached.data)
      if (cached.revision !== revision) {
        state.syncStatus = 'conflict'
        state.syncError = '其他设备已更新记录。请先导出本机备份，再重新加载云端。'
        return
      }
      state.syncStatus = 'pending'
      await flushSync()
    } else {
      applyData(remote.data || empty)
      saveCache(false)
      state.syncStatus = 'synced'
    }
  } catch (error) {
    if (epoch !== syncEpoch) return
    const cached = read(cacheKey(), null)
    if (cached?.data) {
      revision = cached.revision
      applyData(cached.data)
    } else
      applyData({
        phase: 1,
        logs: {},
        done: {},
        protein: {},
        hits: {},
        checks: {},
        videos: {},
        meals: [],
        ai: [],
        plans: {},
      })
    state.syncStatus = 'error'
    state.syncError = error.message
    throw error
  }
}
export async function flushSync() {
  if (
    !syncUser ||
    syncing ||
    sending ||
    ['conflict', 'loading', 'error'].includes(state.syncStatus)
  )
    return
  const epoch = syncEpoch,
    version = changed
  sending = true
  state.syncStatus = 'saving'
  try {
    const result = await api('/data', { revision, data: snapshot() }, 'PUT')
    if (epoch !== syncEpoch) return
    revision = result.revision
    if (result.new_badges?.length) state.badgeNotice.push(...result.new_badges)
    const dirty = changed !== version
    saveCache(dirty)
    state.syncStatus = dirty ? 'pending' : 'synced'
    state.syncError = ''
    if (dirty) syncTimer = setTimeout(flushSync, 100)
  } catch (error) {
    if (epoch !== syncEpoch) return
    state.syncStatus = error.status === 409 ? 'conflict' : 'error'
    state.syncError = error.message
  } finally {
    sending = false
  }
}
export async function reloadCloud() {
  // Called only after the explicit replacement confirmation in the UI.
  const result = await api('/data')
  revision = result.revision
  applyData(
    result.data || {
      phase: 1,
      logs: {},
      done: {},
      protein: {},
      hits: {},
      checks: {},
      videos: {},
      meals: [],
      ai: [],
      plans: {},
    },
  )
  saveCache(false)
  state.syncStatus = 'synced'
  state.syncError = ''
}
export function disconnectSync() {
  clearTimeout(syncTimer)
  syncEpoch++
  syncUser = null
  state.badgeNotice = []
  state.syncStatus = 'offline'
  state.syncError = ''
  applyData({
    phase: 1,
    logs: {},
    done: {},
    protein: {},
    hits: {},
    checks: {},
    videos: {},
    meals: [],
    ai: [],
    plans: {},
  })
}

export function previousLog(name, key, id) {
  const entries = Object.entries(state.logs)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([k, list]) => list.map((entry) => ({ ...entry, key: k })))
  const index = id ? entries.findIndex((entry) => entry.key === key && entry.id === id) : -1
  return (
    id && index >= 0 ? entries.slice(0, index) : entries.filter((entry) => entry.key <= key)
  ).findLast((entry) => entry.name === name)
}

if (demoMode)
  watch(
    () => badgeMetrics(state),
    (stats) => {
      const fresh = catalog.filter(
        (b) => !state.demoBadgeAwards[b.id] && stats[b.metric] >= b.target,
      )
      if (!fresh.length) return
      const now = new Date().toISOString()
      for (const badge of fresh) state.demoBadgeAwards[badge.id] = now
      try {
        localStorage.setItem('tm_demo_badges', JSON.stringify(state.demoBadgeAwards))
      } catch {
        state.storageError = true
      }
      state.badgeNotice.push(...fresh)
    },
    { immediate: true },
  )
