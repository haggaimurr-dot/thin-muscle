import { reactive, computed, watch } from 'vue'
import { PLAN } from './data'
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
for (const [field, key] of Object.entries(keys))
  watch(
    () => state[field],
    (value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
        state.storageError = false
      } catch {
        state.storageError = true
      }
    },
    { deep: true },
  )
let toastTimer
export function notify(message) {
  state.toast = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (state.toast = ''), 4000)
}
export function getPlan(day) {
  return state.plans[week]?.[day] || PLAN[day]
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
  const plan = getPlan(day)
  state.done[week][day] = ['am', 'pm'].every((s) =>
    plan[s].every((ex) => isChecked(day, s, ex.name)),
  )
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
    if (i >= 0) state.logs[key][i] = { ...entry, id: editId }
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
