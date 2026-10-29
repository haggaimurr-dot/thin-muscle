const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const idKeys = ['id', 'meal_id', 'template_id']
// Base is the last acknowledged snapshot. Absence in a newer side is a deletion.
export function mergeSnapshots(base, local, remote, choices = {}) {
  const conflicts = []
  function merge(b, l, r, path) {
    if (same(l, r)) return l
    if (same(b, l)) return r
    if (same(b, r)) return l
    if (object(l) && object(r) && (object(b) || b === undefined)) {
      const out = {}
      for (const key of new Set([...Object.keys(b || {}), ...Object.keys(l), ...Object.keys(r)])) {
        const value = merge(b?.[key], l[key], r[key], `${path}/${key}`)
        if (value !== undefined)
          Object.defineProperty(out, key, {
            value,
            enumerable: true,
            configurable: true,
            writable: true,
          })
      }
      return out
    }
    if (Array.isArray(l) && Array.isArray(r) && (Array.isArray(b) || b === undefined)) {
      const all = [...(b || []), ...l, ...r]
      const key = idKeys.find(
        (k) => all.length && all.every((v) => object(v) && typeof v[k] === 'string' && v[k]),
      )
      if (
        key &&
        [b || [], l, r].every((list) => new Set(list.map((v) => v[key])).size === list.length)
      ) {
        const maps = [b || [], l, r].map((list) => new Map(list.map((v) => [v[key], v])))
        const out = []
        for (const id of new Set([...maps[0].keys(), ...maps[1].keys(), ...maps[2].keys()])) {
          const v = merge(...maps.map((m) => m.get(id)), `${path}/@${id}`)
          if (v !== undefined) out.push(v)
        }
        return out
      }
    }
    if (choices[path] === 'local') return l
    if (choices[path] === 'remote') return r
    conflicts.push({ path, local: l, remote: r, deleted: l === undefined || r === undefined })
    return l
  }
  return { data: merge(base, local, remote, ''), conflicts }
}
