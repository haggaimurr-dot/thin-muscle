export async function api(path, body, method = body === undefined ? 'GET' : 'POST', signal) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE || '/api/v1'}${path}`, {
    method,
    signal,
    headers: { 'Content-Type': 'application/json', 'X-User-Id': '4' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok)
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail.map((e) => e.msg).join('；')
          : `请求失败 (${response.status})`,
    )
  return data
}
