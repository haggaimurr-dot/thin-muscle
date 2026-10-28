let csrf = ''
export function setCsrf(value) {
  csrf = value || ''
}
export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
export async function api(path, body, method = body === undefined ? 'GET' : 'POST', signal) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE || '/api/v1'}${path}`, {
    method,
    signal,
    credentials: 'include',
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      ...(demoMode ? { 'X-User-Id': '4' } : {}),
    },
    ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      typeof data.detail === 'string'
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail.map((e) => e.msg).join('；')
          : `请求失败 (${response.status})`,
    )
    error.status = response.status
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'))
    throw error
  }
  return data
}
