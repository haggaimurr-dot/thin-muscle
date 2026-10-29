const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c],
  )
export function badgeShareSvg(badge) {
  if (!badge?.earned_at) throw new Error('只能导出已获得的徽章')
  // Explicit allow-list: no account ID, nickname, body measurements or raw logs.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="480" viewBox="0 0 960 480"><rect width="960" height="480" rx="32" fill="#183d32"/><circle cx="480" cy="115" r="58" fill="#e9c46a"/><text x="480" y="132" text-anchor="middle" font-size="48" fill="#183d32">★</text><g fill="#fff" text-anchor="middle" font-family="sans-serif"><text x="480" y="235" font-size="36">${escape(badge.title)}</text><text x="480" y="295" font-size="20">${escape(badge.description)}</text><text x="480" y="365" font-size="20">薄肌俱乐部 · 规则版本 1</text><text x="480" y="410" font-size="16">个人成长记录 · ${escape(badge.category)}</text></g></svg>`
}
