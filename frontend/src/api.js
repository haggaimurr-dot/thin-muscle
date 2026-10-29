let csrf = ''
export function setCsrf(value) {
  csrf = value || ''
}
export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
export async function api(
  path,
  body,
  method = body === undefined ? 'GET' : 'POST',
  signal,
  onProgress,
) {
  const url = `${import.meta.env.VITE_API_BASE || '/api/v1'}${path}`
  const response = onProgress
    ? await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(method, url)
        xhr.withCredentials = true
        xhr.timeout = 60000
        if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf)
        if (demoMode) xhr.setRequestHeader('X-User-Id', '4')
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
        }
        xhr.onload = () =>
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            json: async () => JSON.parse(xhr.responseText),
          })
        xhr.onerror = () => reject(new Error('上传连接失败，请检查网络后重试'))
        xhr.ontimeout = () => reject(new Error('上传超时，请重试'))
        xhr.onabort = () => reject(new Error('上传已取消'))
        xhr.send(body)
      })
    : await fetch(url, {
        method,
        signal,
        credentials: 'include',
        headers: {
          ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          ...(demoMode ? { 'X-User-Id': '4' } : {}),
        },
        ...(body === undefined
          ? {}
          : { body: body instanceof FormData ? body : JSON.stringify(body) }),
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
    error.details = data.detail
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'))
    throw error
  }
  return data
}
