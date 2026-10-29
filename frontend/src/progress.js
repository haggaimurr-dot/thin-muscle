// Calendar dates are date-only values; UTC arithmetic avoids DST moving records.
export function periodDays(period) {
  if (typeof period !== 'string' || !/^20\d{2}(-(0[1-9]|1[0-2]))?$/.test(period))
    throw new Error('请选择2000–2099年的有效周期')
  const year = Number(period.slice(0, 4))
  return period.length === 7
    ? new Date(Date.UTC(year, Number(period.slice(5)), 0)).getUTCDate()
    : new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1
      ? 366
      : 365
}
export function validateGoals(goals) {
  if (
    !goals ||
    typeof goals !== 'object' ||
    Array.isArray(goals) ||
    Object.keys(goals).length > 1500
  )
    throw new Error('个人目标格式错误')
  for (const [period, goal] of Object.entries(goals)) {
    const max = periodDays(period)
    if (
      !goal ||
      typeof goal !== 'object' ||
      Array.isArray(goal) ||
      Object.keys(goal).sort().join() !== 'protein_days,strength_days' ||
      Object.values(goal).some((v) => !Number.isInteger(v) || v < 1 || v > max)
    )
      throw new Error('目标天数须为该周期内的正整数')
  }
}
export function goalFor(goals, period) {
  const fallback =
    period.length === 7
      ? { strength_days: 12, protein_days: 20 }
      : { strength_days: 156, protein_days: 240 }
  try {
    if (!goals?.[period]) return fallback
    validateGoals({ [period]: goals[period] })
    return { ...goals[period] }
  } catch {
    return fallback
  }
}
export function recordDate(week, day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !/^[1-7]$/.test(String(day))) return null
  const d = new Date(week + 'T00:00:00Z')
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== week || d.getUTCDay() !== 1)
    return null
  d.setUTCDate(d.getUTCDate() + Number(day) - 1)
  return d.toISOString().slice(0, 10)
}
export function scheduledStrengthDays(data, week) {
  return [1, 2, 3, 4, 5, 6, 7].filter((day) => {
    const custom = data.plans?.[week]?.[day]
    return custom ? ['push', 'pull', 'legs'].includes(custom.type) : [1, 3, 5].includes(day)
  })
}
export function periodProgress(data, period, asOf) {
  const count = periodDays(period)
  const daily = new Map()
  const ensure = (date) => {
    if (!date || !date.startsWith(period) || date > asOf) return null
    if (!daily.has(date)) daily.set(date, { date, strength: 0, protein: 0, proteinDays: 0 })
    return daily.get(date)
  }
  for (const [w, days] of Object.entries(data.done || {})) {
    for (const day of scheduledStrengthDays(data, w)) {
      if (days?.[day] !== true) continue
      const row = ensure(recordDate(w, day))
      if (row) row.strength = 1
    }
  }
  for (const [w, days] of Object.entries(data.protein || {})) {
    for (const [day, value] of Object.entries(days || {})) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue
      const row = ensure(recordDate(w, day))
      if (row) {
        row.protein = value
        row.proteinDays = value >= 150 ? 1 : 0
      }
    }
  }
  const rows = Array.from({ length: period.length === 7 ? count : 12 }, (_, i) => ({
    label: period + '-' + String(i + 1).padStart(2, '0'),
    strength: 0,
    proteinDays: 0,
    protein: 0,
  }))
  const total = { strength: 0, proteinDays: 0, protein: 0 }
  for (const row of daily.values()) {
    const bucket = rows[Number(row.date.slice(period.length + 1, period.length + 3)) - 1]
    for (const field of ['strength', 'proteinDays', 'protein']) {
      total[field] += row[field]
      bucket[field] += row[field]
    }
  }
  return { rows, total, details: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)) }
}
