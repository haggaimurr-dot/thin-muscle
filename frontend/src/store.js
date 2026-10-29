import { reactive, computed, watch } from 'vue'
import { PLAN } from './data'
import { api, demoMode } from './api'
import { catalog, badgeMetrics } from './badges'
import { validateGoals } from './progress'
import { recordDate, scheduledStrengthDays } from './progress'
import { nutritionGoalAt, validateNutritionGoals } from './nutrition-goals'
import { mergeSnapshots } from './sync-merge'
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
  goals: read('tm_period_goals_v1', {}),
  proteinTarget: read('tm_protein_target_v1', 150),
  mealTemplates: read('tm_meal_templates_v1', []),
  nutritionGoals: read('tm_nutrition_goals_v1', {}),
  toast: '',
  storageError: false,
  badgeNotice: [],
  demoBadgeAwards: read('tm_demo_badges', {}),
  syncStatus: 'offline',
  remoteChanged: false,
  updateReminders: read('tm_update_reminders', true),
  syncError: '',
  localUpdatedAt: '',
  remoteUpdatedAt: '',
  networkOnline: navigator.onLine,
  theme: read('tm_theme', 'light'),
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
  goals: 'tm_period_goals_v1',
  proteinTarget: 'tm_protein_target_v1',
  mealTemplates: 'tm_meal_templates_v1',
  nutritionGoals: 'tm_nutrition_goals_v1',
}
let baseSnapshot = null
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
  localStorage.setItem(
    cacheKey(),
    JSON.stringify({
      revision,
      data: snapshot(),
      dirty,
      base: baseSnapshot,
      conflict: state.syncStatus === 'conflict',
      localUpdatedAt: state.localUpdatedAt,
    }),
  )
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
          state.localUpdatedAt = new Date().toISOString()
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
/* 主题：light=浅 white=白 black=黑，仅存本地不云同步 */
export function applyTheme() {
  const t = ['light', 'white', 'black'].includes(state.theme) ? state.theme : 'light'
  document.documentElement.dataset.theme = t
}
export function setTheme(t) {
  state.theme = t
  try {
    localStorage.setItem('tm_theme', JSON.stringify(t))
  } catch {}
  applyTheme()
}
export function notify(message) {
  state.toast = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (state.toast = ''), 4000)
}
export function getPlan(day, w = week, phase = state.phase) {
  const custom = state.plans[w]?.[day]
  if (custom) return custom
  const plan = PLAN[day]
  return {
    ...plan,
    pm: plan.pm.map((ex) => ({
      ...ex,
      sets:
        phase > 1 && !ex.noSets && !ex.timed && (ex.sets === 3 || ex.sets === '3–4') ? 4 : ex.sets,
    })),
  }
}
export function sessionKey(day, session, w = week) {
  return `${w}|${day}-${session}`
}
export function isChecked(day, session, name, w = week) {
  return !!state.checks[w]?.[`${day}-${session}::${name}`]
}
export function toggleCheck(day, session, name, value, w = week) {
  state.checks[w] ??= {}
  state.checks[w][`${day}-${session}::${name}`] = value
  recalculateDay(day, w)
}
export function recalculateDay(day, w = week) {
  state.done[w] ??= {}
  const plan = getPlan(day, w)
  state.done[w][day] =
    plan.am.length + plan.pm.length > 0 &&
    ['am', 'pm'].every((s) => plan[s].every((ex) => isChecked(day, s, ex.name, w)))
}
export const proteinTarget = computed(
  () => nutritionGoalAt(state.nutritionGoals, ymd(), state.proteinTarget || 150).protein,
)
export const proteinToday = computed(() => Number(state.protein[week]?.[today] || 0))
export function changeProtein(delta, day = today, w = week) {
  state.protein[w] ??= {}
  state.hits[w] ??= {}
  const next = Math.max(0, Number(state.protein[w][day] || 0) + delta)
  state.protein[w][day] = Math.round(next * 10) / 10
  state.hits[w][day] = next >= proteinTarget.value
}
export const strengthDays = (w = week) => scheduledStrengthDays(state, w)
export const strengthSchedule = computed(() => strengthDays())
export const strengthDone = computed(
  () => strengthDays().filter((day) => state.done[week]?.[day]).length,
)
export const proteinDays = computed(
  () =>
    Object.entries(state.protein[week] || {}).filter(
      ([day, g]) =>
        g >=
        nutritionGoalAt(state.nutritionGoals, recordDate(week, day), state.proteinTarget).protein,
    ).length,
)
export const overloadDetails = computed(() => {
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
  return Object.entries(current).map(([name, value]) => ({
    name,
    current: value,
    previous: previous[name],
    improved:
      !!previous[name] &&
      (value.load > previous[name].load ||
        (value.load === previous[name].load && value.reps > previous[name].reps)),
  }))
})
export const overload = computed(
  () => overloadDetails.value.filter((entry) => entry.improved).length,
)
export const streak = computed(() => {
  let count = 0
  const d = new Date(week + 'T12:00:00')
  while (count < 520) {
    const w = ymd(d)
    if (strengthDays(w).filter((day) => state.done[w]?.[day]).length < 2) break
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
  const id = editId || uid()
  state.logs[key] ??= []
  if (editId) {
    const i = state.logs[key].findIndex((x) => x.id === editId)
    if (i >= 0) state.logs[key][i] = { ...state.logs[key][i], ...entry, id: editId }
  } else
    state.logs[key].push({
      ...entry,
      id,
      at: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    })
  notify('训练记录已保存')
  return id
}
export function currentBackupData() {
  return JSON.parse(
    JSON.stringify({
      _version: 3,
      ...Object.fromEntries(Object.entries(keys).map(([field, key]) => [key, state[field]])),
    }),
  )
}
export function exportData() {
  const data = currentBackupData()
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
  if (data._version !== undefined && data._version !== 3)
    throw new Error('不支持的备份版本，请使用兼容版本导出')
  for (const [field, key] of Object.entries(keys)) {
    if (field === 'mealTemplates' && !Object.hasOwn(data, key)) data[key] = []
    if (field === 'proteinTarget' && !Object.hasOwn(data, key)) data[key] = 150
    if (field === 'nutritionGoals' && !Object.hasOwn(data, key)) data[key] = {}
    if (['goals', 'nutritionGoals'].includes(field) && !Object.hasOwn(data, key)) data[key] = {}
    if (!Object.hasOwn(data, key)) throw new Error('备份不完整，缺少 ' + key)
    const value = data[key]
    if (field === 'proteinTarget') {
      if (!Number.isInteger(value) || value < 1 || value > 1000)
        throw new Error('蛋白目标须为1–1000g整数')
    } else if (field === 'phase') {
      if (!Number.isInteger(value) || value < 1 || value > 4) throw new Error('训练阶段无效')
    } else if (['meals', 'ai', 'mealTemplates'].includes(field)) {
      if (
        !Array.isArray(value) ||
        value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))
      )
        throw new Error('备份中的列表格式无效：' + key)
    } else if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('备份中的记录格式无效：' + key)
    }
  }
  validateGoals(data.tm_period_goals_v1)
  validateNutritionGoals(data.tm_nutrition_goals_v1)
  const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  for (const field of ['done', 'protein', 'hits', 'checks', 'plans']) {
    for (const days of Object.values(data[keys[field]])) {
      if (!plain(days)) throw new Error('备份中的每周记录格式无效')
      if (
        field === 'protein' &&
        Object.values(days).some(
          (v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10000,
        )
      )
        throw new Error('备份中的蛋白摄入值无效')
      if (
        ['done', 'hits', 'checks'].includes(field) &&
        Object.values(days).some((v) => typeof v !== 'boolean')
      )
        throw new Error('备份中的完成状态无效')
      if (field === 'plans')
        for (const [day, plan] of Object.entries(days)) {
          if (
            !/^[1-7]$/.test(day) ||
            !plain(plan) ||
            ['am', 'pm'].some(
              (session) =>
                !Array.isArray(plan[session]) ||
                plan[session].some(
                  (e) => !plain(e) || typeof e.name !== 'string' || !e.name.trim(),
                ),
            )
          )
            throw new Error('备份中的自定义计划无效')
        }
    }
  }
  if (Object.values(data.tm_video_bind_v1).some((v) => typeof v !== 'string'))
    throw new Error('备份中的教学链接格式无效')
  for (const meal of [...data.tm_meal_hist_v1, ...data.tm_meal_templates_v1]) {
    if (meal.title !== undefined && typeof meal.title !== 'string')
      throw new Error('备份中的食物名称无效')
    for (const field of ['base_kcal', 'base_protein_g', 'base_carb_g', 'base_fat_g', 'portion']) {
      if (
        field in meal &&
        (typeof meal[field] !== 'number' ||
          !Number.isFinite(meal[field]) ||
          meal[field] < 0 ||
          (field === 'portion' && meal[field] === 0))
      )
        throw new Error('备份中的餐食营养值或份量无效')
    }
  }
  for (const entries of Object.values(data.tm_logs_v2)) {
    if (
      !Array.isArray(entries) ||
      entries.some((entry) => !entry || typeof entry !== 'object' || typeof entry.name !== 'string')
    )
      throw new Error('训练记录格式无效')
    for (const entry of entries)
      if (
        entry.photos !== undefined &&
        (!Array.isArray(entry.photos) ||
          entry.photos.length > 3 ||
          entry.photos.some((p) => typeof p !== 'string'))
      )
        throw new Error('备份中的图片引用格式无效')
  }
  return data
}
export function backupSummary(data) {
  const dates = []
  let logs = 0,
    photos = 0,
    embedded = 0
  for (const [key, entries] of Object.entries(data.tm_logs_v2)) {
    const match = key.match(/^(.+)\|([1-7])-(am|pm)$/)
    const date = match && recordDate(match[1], match[2])
    if (date) dates.push(date)
    logs += entries.length
    for (const entry of entries)
      for (const photo of entry.photos || []) {
        photos++
        if (String(photo).startsWith('data:')) embedded++
      }
  }
  for (const [w, days] of Object.entries(data.tm_pro_g_v2))
    for (const day of Object.keys(days)) {
      const date = recordDate(w, day)
      if (date) dates.push(date)
    }
  for (const meal of data.tm_meal_hist_v1)
    if (/^\d{4}-\d{2}-\d{2}$/.test(meal.date || '')) dates.push(meal.date)
  dates.sort()
  return {
    version: data._version || '旧版（兼容格式）',
    logs,
    meals: data.tm_meal_hist_v1.length,
    photos,
    embedded,
    first: dates[0] || '无日期',
    last: dates.at(-1) || '无日期',
  }
}
export function restoreBackup(data) {
  // Validate first; persist before applying any reactive changes.
  const checked = parseBackup(JSON.stringify(data))
  const restored = Object.fromEntries(
    Object.entries(keys).map(([field, key]) => [field, checked[key]]),
  )
  const updatedAt = new Date().toISOString()
  if (syncUser) {
    localStorage.setItem(
      cacheKey(),
      JSON.stringify({
        revision,
        data: restored,
        base: baseSnapshot,
        dirty: true,
        conflict: state.syncStatus === 'conflict',
        localUpdatedAt: updatedAt,
      }),
    )
    applyData(restored)
    changed++
    state.localUpdatedAt = updatedAt
    if (state.syncStatus !== 'conflict') {
      state.syncStatus = 'pending'
      clearTimeout(syncTimer)
      syncTimer = setTimeout(flushSync, 800)
    }
  } else {
    const old = Object.fromEntries(
      Object.values(keys).map((key) => [key, localStorage.getItem(key)]),
    )
    try {
      for (const [field, key] of Object.entries(keys))
        localStorage.setItem(key, JSON.stringify(restored[field]))
    } catch {
      for (const [key, value] of Object.entries(old)) {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      }
      throw new Error('浏览器存储失败，原记录已保留，请释放空间后重试')
    }
    applyData(restored)
  }
  state.storageError = false
  notify('备份已导入')
}

function applyData(data) {
  syncing = true
  for (const field of Object.keys(keys))
    state[field] =
      data[field] ??
      (['goals', 'nutritionGoals'].includes(field)
        ? {}
        : field === 'proteinTarget'
          ? 150
          : field === 'mealTemplates'
            ? []
            : data[field])
  syncing = false
}
export async function connectSync(userId) {
  sending = false
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
    state.remoteUpdatedAt = remote.updated_at || ''
    state.localUpdatedAt = cached?.localUpdatedAt || ''
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
      baseSnapshot = cached.base || null
      applyData(cached.data)
      if (cached.revision !== revision || cached.conflict) {
        state.syncStatus = 'conflict'
        state.syncError = '其他设备已更新记录。请先导出本机备份，再重新加载云端。'
        return
      }
      state.syncStatus = 'pending'
      await flushSync()
    } else {
      applyData(remote.data || empty)
      baseSnapshot = snapshot()
      saveCache(false)
      state.syncStatus = 'synced'
    }
  } catch (error) {
    if (epoch !== syncEpoch) return
    const cached = read(cacheKey(), null)
    if (cached?.data) {
      revision = cached.revision
      baseSnapshot = cached.base || null
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
    const sent = snapshot()
    const result = await api('/data', { revision, data: sent }, 'PUT')
    if (epoch !== syncEpoch) return
    baseSnapshot = sent
    revision = result.revision
    state.remoteUpdatedAt = result.updated_at || ''
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
    if (error.status === 409) {
      try {
        const remote = await api('/data')
        if (epoch === syncEpoch) state.remoteUpdatedAt = remote.updated_at || ''
      } catch {}
    }
  } finally {
    if (epoch === syncEpoch) sending = false
  }
}
export async function reloadCloud() {
  // Called only after the explicit replacement confirmation in the UI.
  const result = await api('/data')
  revision = result.revision
  state.remoteUpdatedAt = result.updated_at || ''
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
  baseSnapshot = snapshot()
  state.remoteChanged = false
  saveCache(false)
  state.syncStatus = 'synced'
  state.syncError = ''
}
window.addEventListener('online', () => {
  state.networkOnline = true
})
window.addEventListener('offline', () => {
  state.networkOnline = false
})
export async function retrySync() {
  if (!syncUser || state.syncStatus !== 'error') return
  state.syncStatus = 'pending'
  state.syncError = ''
  await flushSync()
}
export function disconnectSync() {
  sending = false
  clearTimeout(syncTimer)
  syncEpoch++
  syncUser = null
  baseSnapshot = null
  state.remoteChanged = false
  state.badgeNotice = []
  state.syncStatus = 'offline'
  state.syncError = ''
  state.remoteUpdatedAt = ''
  state.localUpdatedAt = ''
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

export async function prepareSyncMerge() {
  if (!syncUser || !baseSnapshot) throw new Error('缺少共同同步版本，请先导出副本并选择重载云端')
  const epoch = syncEpoch
  const remote = await api('/data')
  if (epoch !== syncEpoch) throw new Error('账号已切换，请重新打开合并')
  const local = snapshot()
  return {
    epoch,
    changed,
    base: JSON.parse(JSON.stringify(baseSnapshot)),
    local,
    remote,
    result: mergeSnapshots(baseSnapshot, local, remote.data || {}),
  }
}
export async function commitSyncMerge(preview, choices) {
  if (preview.epoch !== syncEpoch || preview.changed !== changed || sending)
    throw new Error('本机记录已改变，请重新预览合并')
  const merged = mergeSnapshots(preview.base, preview.local, preview.remote.data || {}, choices)
  if (merged.conflicts.length) throw new Error('请逐项选择冲突内容')
  // Reuse the full backup validator before sending or applying any merge.
  parseBackup(
    JSON.stringify({
      _version: 3,
      ...Object.fromEntries(Object.entries(keys).map(([f, k]) => [k, merged.data[f]])),
    }),
  )
  const epoch = syncEpoch
  sending = true
  try {
    const result = await api(
      '/data',
      { revision: preview.remote.revision, data: merged.data },
      'PUT',
    )
    if (epoch !== syncEpoch) return
    revision = result.revision
    state.remoteUpdatedAt = result.updated_at || ''
    const during = mergeSnapshots(preview.local, snapshot(), merged.data)
    if (during.conflicts.length) {
      baseSnapshot = preview.local
      state.syncStatus = 'conflict'
      state.syncError = '提交期间本机继续编辑，副本已保留，请再次预览合并'
      saveCache(true)
      return
    }
    applyData(during.data)
    baseSnapshot = merged.data
    state.remoteChanged = false
    state.syncError = ''
    const dirty = JSON.stringify(during.data) !== JSON.stringify(merged.data)
    state.syncStatus = dirty ? 'pending' : 'synced'
    saveCache(dirty)
    if (dirty) syncTimer = setTimeout(flushSync, 100)
  } finally {
    if (epoch === syncEpoch) sending = false
  }
}
export async function checkRemoteUpdates() {
  if (
    !syncUser ||
    !state.updateReminders ||
    sending ||
    !state.networkOnline ||
    state.syncStatus !== 'synced'
  )
    return
  const epoch = syncEpoch
  try {
    const remote = await api('/data')
    if (epoch === syncEpoch && remote.revision !== revision) {
      state.remoteChanged = true
      state.remoteUpdatedAt = remote.updated_at || ''
      state.syncStatus = 'conflict'
      state.syncError = '其他设备有新记录；请预览合并或备份后重载'
    }
  } catch {
    /* A read-only reminder failure does not discard cached data. */
  }
}
watch(
  () => state.updateReminders,
  (v) => localStorage.setItem('tm_update_reminders', JSON.stringify(v)),
)
window.addEventListener('focus', checkRemoteUpdates)
setInterval(checkRemoteUpdates, 45000)

export function connectOffline(userId) {
  const cached = read('tm_account_cache_' + userId, null)
  if (!cached?.data) throw new Error('没有可用的账号离线缓存，请联网登录')
  syncUser = userId
  syncEpoch++
  revision = cached.revision
  baseSnapshot = cached.base || null
  applyData(cached.data)
  state.localUpdatedAt = cached.localUpdatedAt || ''
  state.syncStatus = cached.conflict ? 'conflict' : 'error'
  state.syncError = '离线缓存：登录尚未重新验证，联网后恢复同步'
}
