<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Modal from './Modal.vue'
import { auth } from '../auth'
import { api, demoMode } from '../api'
import { currentBackupData, parseBackup, restoreBackup, backupSummary, ymd, notify } from '../store'
import { createArchive, verifyArchive, checksum } from '../archive'
const owner = computed(() => (demoMode ? 'demo' : String(auth.user?.id || 'none')))
const key = () => 'tm_auto_backup_' + owner.value
const setting = () => 'tm_auto_backup_enabled_' + owner.value
const enabled = ref(localStorage.getItem(setting()) === 'true')
watch(enabled, (v) => {
  localStorage.setItem(setting(), String(v))
  tick()
})
const list = ref([]),
  busy = ref(false),
  error = ref(''),
  preview = ref(null),
  input = ref(null)
function refresh() {
  try {
    list.value = JSON.parse(localStorage.getItem(key()) || '[]')
  } catch {
    list.value = []
  }
}
async function capture(manual = false) {
  const account = owner.value
  refresh()
  if (!manual && list.value.some((r) => r.date === ymd())) return
  const data = currentBackupData(),
    text = JSON.stringify(data)
  const sha256 = await checksum(text)
  if (account !== owner.value) return
  const next = [
    { date: ymd(), created_at: new Date().toISOString(), data, sha256 },
    ...list.value,
  ].slice(0, 7)
  localStorage.setItem(key(), JSON.stringify(next))
  list.value = next
}
async function tick() {
  if (enabled.value)
    try {
      await capture()
    } catch (e) {
      error.value = '自动备份失败（当前记录保留）：' + e.message
    }
}
async function run(fn) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await fn()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
function download(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
async function readPhoto(id) {
  let response
  if (/^data:image\/(jpeg|png|webp);base64,/.test(id)) response = await fetch(id)
  else if (/^[a-f0-9]{32}$/.test(id))
    response = await fetch(`${import.meta.env.VITE_API_BASE || '/api/v1'}/photos/${id}`, {
      credentials: 'include',
    })
  else throw new Error('存在不支持的图片引用，请修复后归档')
  if (!response.ok) throw new Error('图片缺失或无权读取，归档未生成')
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    mime: response.headers.get('content-type')?.split(';')[0],
  }
}
function exportArchive() {
  run(async () => {
    const account = owner.value
    const archive = await createArchive(currentBackupData(), readPhoto)
    if (account !== owner.value) throw new Error('账号已切换，归档已取消')
    download(archive, `thin-muscle-${ymd()}.tmarchive.json`)
  })
}
async function openFile(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  run(async () => {
    if (file.size > 150 * 1024 * 1024) throw new Error('归档不能超过150MB')
    const account = owner.value
    const archive = JSON.parse(await file.text())
    const images = await verifyArchive(archive)
    const data = parseBackup(JSON.stringify(archive.data))
    if (account !== owner.value) throw new Error('账号已切换，请重新选择归档')
    preview.value = { account, data, images, count: images.size }
  })
}
function openSnapshot(row) {
  run(async () => {
    if ((await checksum(JSON.stringify(row.data))) !== row.sha256)
      throw new Error('本机备份校验失败')
    preview.value = {
      account: owner.value,
      data: parseBackup(JSON.stringify(row.data)),
      images: null,
      count: null,
    }
  })
}
async function restore() {
  await run(async () => {
    const selected = preview.value,
      uploaded = [],
      replacements = new Map()
    try {
      const ensureOwner = () => {
        if (selected.account !== owner.value) throw new Error('账号已切换，恢复已取消')
      }
      for (const [id, image] of selected.images || []) {
        ensureOwner()
        const blob = new Blob([image.bytes], { type: image.mime })
        if (demoMode)
          replacements.set(
            id,
            await new Promise((resolve) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.readAsDataURL(blob)
            }),
          )
        else {
          const body = new FormData()
          body.append('file', blob, 'restored-image')
          const result = await api('/photos', body)
          uploaded.push(result.id)
          replacements.set(id, result.id)
        }
      }
      ensureOwner()
      const data = JSON.parse(JSON.stringify(selected.data))
      for (const entries of Object.values(data.tm_logs_v2))
        for (const entry of entries)
          entry.photos = (entry.photos || []).map((id) => replacements.get(id) || id)
      parseBackup(JSON.stringify(data))
      restoreBackup(data)
      preview.value = null
      notify('恢复已写入本机，账号记录将通过版本同步保存')
    } catch (e) {
      let cleanupFailed = false
      for (const id of uploaded)
        try {
          await api('/photos/' + id, undefined, 'DELETE')
        } catch {
          cleanupFailed = true
        }
      throw new Error(e.message + (cleanupFailed ? '；部分未引用图片清理失败，请检查图片空间' : ''))
    }
  })
}
function clear() {
  localStorage.removeItem(key())
  refresh()
}
let timer
onMounted(() => {
  refresh()
  tick()
  timer = setInterval(tick, 60000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>
<template>
  <section class="panel" aria-label="自动备份与图片归档">
    <h2>自动备份与图片归档</h2>
    <p>
      自动备份保存在当前浏览器、按账号隔离；页面打开时每天保留一份记录快照，最多7份。快照仅含图片引用；完整图片请另行下载归档。浏览器清理会丢失本机备份。
    </p>
    <label><input v-model="enabled" type="checkbox" />启用本机每日自动备份</label>
    <div class="row wrap">
      <button class="btn" :disabled="busy" @click="run(() => capture(true))">
        立即保存本机快照</button
      ><button class="btn" :disabled="busy" @click="exportArchive">下载含图片完整归档</button
      ><button class="btn" :disabled="busy" @click="input.click()">选择完整归档恢复</button
      ><button class="btn" :disabled="busy" @click="clear">清除本机备份快照</button>
    </div>
    <input
      ref="input"
      type="file"
      accept=".json"
      aria-label="选择完整图片归档"
      hidden
      @change="openFile"
    />
    <p v-if="busy" role="status">正在校验或处理归档，请勿切换账号…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <article v-for="(r, i) in list" :key="r.created_at + i" class="history-row">
      <span>{{ r.created_at }} · 记录快照</span
      ><button class="btn" :disabled="busy" @click="openSnapshot(r)">预览恢复快照</button>
    </article>
  </section>
  <Modal v-if="preview" title="确认恢复备份内容" @close="!busy && (preview = null)">
    <p>
      训练{{ backupSummary(preview.data).logs }}条；餐食{{
        backupSummary(preview.data).meals
      }}条；{{
        preview.count === null
          ? '图片仅引用，原图缺失时无法恢复'
          : '已校验图片 ' + preview.count + ' 张，将重新上传并重建引用'
      }}。
    </p>
    <p>
      确认后替换当前账号本机的训练、饮食、计划与目标。建议先保存当前快照。上传失败不会替换记录；同步冲突仍须处理。
    </p>
    <button class="btn" :disabled="busy" @click="preview = null">取消恢复</button
    ><button class="btn primary" :disabled="busy" @click="restore">确认恢复记录及图片</button>
  </Modal>
</template>
