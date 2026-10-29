export async function checksum(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
}
export const decodeImage = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
export function encodeImage(bytes) {
  let text = ''
  for (let i = 0; i < bytes.length; i += 16384)
    text += String.fromCharCode(...bytes.slice(i, i + 16384))
  return btoa(text)
}
export async function createArchive(data, readPhoto) {
  const images = []
  const ids = new Set(
    Object.values(data.tm_logs_v2).flatMap((entries) => entries.flatMap((e) => e.photos || [])),
  )
  for (const id of ids) {
    const { bytes, mime } = await readPhoto(id)
    images.push({ id, mime, base64: encodeImage(bytes), sha256: await checksum(bytes) })
  }
  const archive = {
    format: 'thin-muscle-archive',
    version: 1,
    created_at: new Date().toISOString(),
    data,
    images,
  }
  archive.sha256 = await checksum(JSON.stringify(archive))
  return archive
}
export async function verifyArchive(archive) {
  if (
    !archive ||
    archive.format !== 'thin-muscle-archive' ||
    archive.version !== 1 ||
    !Array.isArray(archive.images)
  )
    throw new Error('不支持的图片归档格式')
  const { sha256, ...content } = archive
  if ((await checksum(JSON.stringify(content))) !== sha256)
    throw new Error('归档清单校验失败，文件已损坏或被改动')
  const ids = new Set(),
    images = new Map()
  let total = 0
  for (const image of archive.images) {
    if (
      typeof image.id !== 'string' ||
      ids.has(image.id) ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(image.mime) ||
      typeof image.base64 !== 'string'
    )
      throw new Error('归档图片清单无效')
    const bytes = decodeImage(image.base64)
    total += bytes.length
    if (bytes.length > 8 * 1024 * 1024 || total > 100 * 1024 * 1024)
      throw new Error('归档图片超过大小限制')
    if ((await checksum(bytes)) !== image.sha256)
      throw new Error('归档图片校验失败：' + image.id.slice(0, 40))
    ids.add(image.id)
    images.set(image.id, { bytes, mime: image.mime })
  }
  for (const entries of Object.values(archive.data?.tm_logs_v2 || {}))
    for (const entry of entries)
      for (const id of entry.photos || [])
        if (!images.has(id)) throw new Error('归档缺少训练图片，未恢复任何记录')
  return images
}
