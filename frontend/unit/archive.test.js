import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createArchive, verifyArchive, checksum } from '../src/archive.js'
test('archive preserves separate image entries and rejects corruption or missing images', async () => {
  const data = { tm_logs_v2: { '2026-01-05|1-am': [{ name: 'push', photos: ['image-id'] }] } }
  const archive = await createArchive(data, async () => ({
    bytes: new Uint8Array([1, 2, 3]),
    mime: 'image/png',
  }))
  assert.equal((await verifyArchive(archive)).get('image-id').bytes.length, 3)
  const corrupt = structuredClone(archive)
  corrupt.data.tm_logs_v2 = {}
  await assert.rejects(() => verifyArchive(corrupt), /清单校验失败/)
  const missing = { ...archive, images: [] }
  delete missing.sha256
  missing.sha256 = await checksum(JSON.stringify(missing))
  await assert.rejects(() => verifyArchive(missing), /缺少训练图片/)
})
