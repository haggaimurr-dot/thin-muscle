export const maxPhotos = 3
export function photoUrl(value) {
  if (/^[a-f0-9]{32}$/.test(value))
    return `${import.meta.env.VITE_API_BASE || '/api/v1'}/photos/${value}`
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value
  return undefined
}
export async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
    throw new Error('请选择 8MB 以内的 JPEG、PNG 或 WebP 图片')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (image.naturalWidth * image.naturalHeight > 20_000_000)
      throw new Error('图片尺寸过大，请选择 2000 万像素以内的图片')
    const ratio = Math.min(1, 960 / image.naturalWidth, 960 / image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    let result = canvas.toDataURL('image/jpeg', 0.7)
    if (result.length > 300_000) result = canvas.toDataURL('image/jpeg', 0.4)
    if (result.length > 400_000) throw new Error('图片压缩后仍过大，请裁剪后再添加')
    return result
  } catch (error) {
    if (error.name === 'EncodingError') throw new Error('图片无法读取，请换一张图片')
    throw error
  } finally {
    URL.revokeObjectURL(url)
  }
}
