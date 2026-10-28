import catalog from '../../shared/badges.json'
export { catalog }
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function badgeMetrics(data, today = ymd(new Date())) {
  const strength = new Set(),
    protein = new Set(),
    journals = new Set(),
    rest = new Set(),
    weeks = new Map()
  function recordedDate(week, day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !/^[1-7]$/.test(String(day))) return null
    const date = new Date(week + 'T12:00:00')
    if (Number.isNaN(date.getTime()) || ymd(date) !== week || date.getDay() !== 1) return null
    date.setDate(date.getDate() + Number(day) - 1)
    const actual = ymd(date)
    return actual <= today ? actual : null
  }
  for (const [week, days] of Object.entries(data.done || {}))
    for (const [day, completed] of Object.entries(days || {})) {
      const date = recordedDate(week, day)
      if (!date || completed !== true) continue
      if ([1, 3, 5].includes(Number(day))) {
        strength.add(date)
        if (!weeks.has(week)) weeks.set(week, new Set())
        weeks.get(week).add(day)
      } else rest.add(week)
    }
  for (const [week, days] of Object.entries(data.protein || {}))
    for (const [day, grams] of Object.entries(days || {})) {
      const date = recordedDate(week, day)
      if (date && typeof grams === 'number' && Number.isFinite(grams) && grams >= 150)
        protein.add(date)
    }
  for (const [key, entries] of Object.entries(data.logs || {})) {
    const match = key.match(/^(\d{4}-\d{2}-\d{2})\|([1-7])-(am|pm)$/)
    if (!match) continue
    const date = recordedDate(match[1], match[2])
    if (
      date &&
      Array.isArray(entries) &&
      entries.some((e) => typeof e.note === 'string' && e.note.trim())
    )
      journals.add(date)
  }
  const valid = [...weeks]
    .filter(([, days]) => days.size >= 2)
    .map(([week]) => week)
    .sort()
  let run = 0,
    longest = 0,
    previous = null
  for (const week of valid) {
    let expected = ''
    if (previous) {
      const d = new Date(previous + 'T12:00:00')
      d.setDate(d.getDate() + 7)
      expected = ymd(d)
    }
    run = expected === week ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = week
  }
  return {
    strength_days: strength.size,
    protein_days: protein.size,
    journal_days: journals.size,
    valid_weeks: valid.length,
    longest_streak: longest,
    balanced_weeks: valid.filter((w) => rest.has(w)).length,
  }
}
export function localBadges(data, awards) {
  const stats = badgeMetrics(data)
  return {
    stats,
    items: catalog.map((b) => ({
      ...b,
      current: stats[b.metric],
      earned_at: awards[b.id] || null,
    })),
    earned_count: Object.keys(awards).filter((id) => catalog.some((b) => b.id === id)).length,
  }
}
export function nextBadge(items) {
  return items
    .filter((b) => !b.earned_at)
    .sort(
      (a, b) =>
        Math.min(1, b.current / b.target) - Math.min(1, a.current / a.target) ||
        a.target - b.target,
    )[0]
}
