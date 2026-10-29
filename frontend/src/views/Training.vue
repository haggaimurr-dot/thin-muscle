<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import TrainingStats from '../components/TrainingStats.vue'
import CustomPlan from '../components/CustomPlan.vue'
import ExerciseLibrary from '../components/ExerciseLibrary.vue'
import { api, demoMode } from '../api'
import { preparePhoto, photoUrl, maxPhotos } from '../photos'
import {
  state,
  today,
  week,
  getPlan,
  isChecked,
  toggleCheck,
  sessionKey,
  saveLog,
  notify,
  previousLog,
  ymd,
  monday,
} from '../store'
import { PHASES, WEEK_LABEL, VIDEO_LIB } from '../data'
import { recordDate } from '../progress'
const route = useRoute(),
  router = useRouter(),
  view = ref(route.query.view || 'today'),
  day = ref(today),
  session = ref('am'),
  edit = ref(null),
  video = ref(null),
  videoTitle = ref(''),
  videoUrl = ref(''),
  deleteTarget = ref(null),
  playingEmbed = ref('')
const selectedWeek = ref(week),
  previewPhase = ref('')
const selectedDate = computed(() => {
  const d = new Date(selectedWeek.value + 'T12:00:00')
  d.setDate(d.getDate() + day.value - 1)
  return ymd(d)
})
function selectDate(value) {
  const date = new Date(value + 'T12:00:00')
  if (Number.isNaN(date.getTime()) || ymd(date) !== value) return
  selectedWeek.value = monday(date)
  day.value = date.getDay() || 7
}
function shiftWeek(delta) {
  const date = new Date(selectedDate.value + 'T12:00:00')
  date.setDate(date.getDate() + delta * 7)
  selectDate(ymd(date))
}
function returnToday() {
  selectDate(ymd())
  previewPhase.value = ''
}
function removePhoto(index) {
  form.value.photos.splice(index, 1)
  photoStates.value.splice(index, 1)
}
watch(
  () => [route.query.date, route.query.session],
  ([date, period]) => {
    if (typeof date === 'string') selectDate(date)
    if (['am', 'pm'].includes(period)) session.value = period
  },
  { immediate: true },
)
watch(
  () => route.query.view,
  (v) => {
    view.value = v || 'today'
  },
)
const form = ref({}),
  plan = computed(() =>
    getPlan(day.value, selectedWeek.value, Number(previewPhase.value) || state.phase),
  ),
  exercises = computed(() => plan.value[session.value])
const photoStates = ref([])
const customOpen = ref(false)
const libraryOpen = ref(false),
  customSeed = ref(null)
function chooseLibrary(ex) {
  customSeed.value = ex
  libraryOpen.value = false
  customOpen.value = true
}
function closeCustom() {
  customOpen.value = false
  customSeed.value = null
}
const photoUsage = ref(null),
  photoUsageError = ref('')
async function loadPhotoUsage() {
  if (demoMode) return
  try {
    photoUsage.value = await api('/photos/usage')
    photoUsageError.value = ''
  } catch {
    photoUsageError.value = '暂时无法读取图片空间，保存时将再次校验'
  }
}

const historyFrom = ref(''),
  historyTo = ref(''),
  historyAction = ref(''),
  historyLimit = ref(20)
watch([historyFrom, historyTo, historyAction], () => {
  historyLimit.value = 20
})
const allHistory = computed(() =>
  Object.entries(state.logs)
    .filter(([key]) => {
      const match = key.match(/^(.+)\|([1-7])-(am|pm)$/)
      const date = match && recordDate(match[1], match[2])
      return (
        date &&
        (!historyFrom.value || date >= historyFrom.value) &&
        (!historyTo.value || date <= historyTo.value)
      )
    })
    .map(([key, entries]) => [
      key,
      entries.filter((e) =>
        e.name?.toLowerCase().includes(historyAction.value.trim().toLowerCase()),
      ),
    ])
    .filter(([, entries]) => entries.length)
    .sort(([a], [b]) => b.localeCompare(a)),
)
const history = computed(() => allHistory.value.slice(0, historyLimit.value))
function clearHistoryFilters() {
  historyFrom.value = ''
  historyTo.value = ''
  historyAction.value = ''
}
function openLog(ex, entry = null, key = null) {
  if (previewPhase.value && !entry) return
  const parts = key?.split('|')[1].split('-')
  edit.value = {
    day: parts ? Number(parts[0]) : day.value,
    session: parts ? parts[1] : session.value,
    id: entry?.id,
    week: key?.split('|')[0] || selectedWeek.value,
  }
  form.value = {
    note: entry?.note || '',
    photos: [...(entry?.photos || [])],
    name: ex.name,
    weight: entry?.weight || '',
    sets: entry?.sets || String(ex.sets || 3),
    reps: entry?.reps || '',
    rpe: entry?.rpe === '—' ? '' : entry?.rpe || 7,
  }
  photoStates.value = form.value.photos.map((photo) => ({
    status: photo.startsWith('data:') ? '待上传' : '已保存',
    progress: 0,
    error: '',
  }))
  loadPhotoUsage()
}
const saving = ref(false),
  preparing = ref(false),
  photoPreview = ref('')
async function addPhotos(event) {
  const files = [...event.target.files]
  event.target.value = ''
  if (files.length + form.value.photos.length > maxPhotos) {
    notify('每条运动记录最多三张图片')
    return
  }
  preparing.value = true
  try {
    for (const file of files) {
      try {
        form.value.photos.push(await preparePhoto(file))
        photoStates.value.push({ status: '待上传', progress: 0, error: '' })
      } catch (error) {
        notify(file.name + '：' + error.message)
      }
    }
  } catch (error) {
    notify(error.message)
  } finally {
    preparing.value = false
  }
}
async function uploadPhoto(index) {
  const status = (photoStates.value[index] ??= { progress: 0, error: '' })
  status.status = '上传中'
  status.error = ''
  try {
    const blob = await (await fetch(form.value.photos[index])).blob()
    const upload = new FormData()
    upload.append('file', blob, 'training.jpg')
    const photo = await api('/photos', upload, 'POST', undefined, (progress) => {
      status.progress = progress
    })
    form.value.photos[index] = photo.id
    status.status = '已上传'
    status.progress = 100
    await loadPhotoUsage()
  } catch (error) {
    status.status = '上传失败'
    status.error = error.message
    throw error
  }
}
async function retryPhoto(index) {
  if (saving.value || preparing.value) return
  saving.value = true
  try {
    await uploadPhoto(index)
  } catch (error) {
    notify(error.message)
  } finally {
    saving.value = false
  }
}
async function submit(continueEntry = false) {
  if (saving.value || preparing.value) return
  saving.value = true
  try {
    if (!demoMode)
      for (let i = 0; i < form.value.photos.length; i++) {
        if (form.value.photos[i].startsWith('data:')) {
          await uploadPhoto(i)
        }
      }
    const savedId = saveLog(
      edit.value.day,
      edit.value.session,
      { ...form.value, weight: form.value.weight || '自重', rpe: form.value.rpe || '—' },
      edit.value.id,
      edit.value.week,
    )
    if (continueEntry && !state.storageError) {
      edit.value.id = undefined
      form.value = { ...form.value, sets: '1', note: '', photos: [] }
      photoStates.value = []
      await nextTick()
      document.querySelector('[data-log-weight]')?.focus()
      notify('已保存；继续记录下一组。账号记录将自动同步。')
    } else if (!state.storageError) edit.value = null
    else {
      edit.value.id = savedId
      notify('本机存储失败，输入已保留，请释放空间并导出备份后重试')
    }
  } catch (error) {
    notify(error.message)
  } finally {
    saving.value = false
  }
}
function complete() {
  if (previewPhase.value) return
  for (const ex of exercises.value)
    toggleCheck(day.value, session.value, ex.name, true, selectedWeek.value)
  notify('本时段训练已完成')
}
function openVideo(name) {
  video.value = name
  playingEmbed.value = ''
  videoTitle.value = ''
  videoUrl.value = ''
}
const videos = computed(() => {
  if (!video.value) return []
  const custom = state.videos[video.value]
  return [
    ...(Array.isArray(custom) ? custom : custom ? [custom] : []),
    ...(VIDEO_LIB[video.value] || []),
  ]
})
function safeUrl(url) {
  try {
    const u = new URL(url)
    return ['https:', 'http:'].includes(u.protocol) ? u.href : null
  } catch {
    return null
  }
}
function bvid(url) {
  try {
    const u = new URL(url)
    if (
      !['https:', 'http:'].includes(u.protocol) ||
      u.username ||
      u.password ||
      u.port ||
      !['www.bilibili.com', 'bilibili.com'].includes(u.hostname)
    )
      return ''
    return u.pathname.match(/^\/video\/(BV[A-Za-z0-9]{10})\/?$/)?.[1] || ''
  } catch {
    return ''
  }
}
async function bindVideo() {
  const url = safeUrl(videoUrl.value)
  if (!url) {
    notify('请输入有效的 HTTP 或 HTTPS 链接')
    return
  }
  try {
    notify('正在解析视频链接…')
    const data = await api('/videos/resolve', { url })
    state.videos[video.value] = [
      { title: videoTitle.value || video.value, url: data.url, embedUrl: data.embedUrl || '' },
    ]
    notify('视频已绑定')
    videoUrl.value = ''
  } catch (e) {
    notify(e.message || '视频链接无效')
  }
}
function playVideo(v) {
  playingEmbed.value =
    v.embedUrl || `https://player.bilibili.com/player.html?bvid=${bvid(v.url)}&autoplay=0`
}
function removeLog() {
  const { key, id } = deleteTarget.value
  state.logs[key] = state.logs[key].filter((e) => e.id !== id)
  deleteTarget.value = null
  notify('记录已删除')
}
function previous() {
  return previousLog(
    form.value.name,
    sessionKey(edit.value?.day, edit.value?.session, edit.value?.week),
    edit.value?.id,
  )
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">SHOW UP FOR YOURSELF</div>
      <h1>每一组，都算数<span class="green-dot">.</span></h1>
      <p>推、拉、腿与恢复，找到属于你的节奏。</p>
    </div>
    <RouterLink to="/tools" class="btn"><Icon name="tools" :size="18" />AI 动作评估</RouterLink>
  </div>
  <div class="tabs">
    <button
      v-for="[id, label] in [
        ['today', '今日训练'],
        ['week', '每周计划'],
        ['history', '训练记录'],
      ]"
      :key="id"
      :class="{ active: view === id }"
      @click="router.replace({ query: { view: id } })"
    >
      {{ label }}
    </button>
  </div>
  <TrainingStats />
  <button class="btn" @click="libraryOpen = true">内置动作库</button>
  <template v-if="view !== 'history'"
    ><section class="panel phase-panel">
      <div>
        <span class="eyebrow">4-WEEK PROGRAM</span>
        <h2>{{ PHASES[Number(previewPhase) || state.phase]?.title }}</h2>
        <p>{{ PHASES[Number(previewPhase) || state.phase]?.focus }}</p>
      </div>
      <div class="phase-picker">
        <button
          v-for="n in 4"
          :key="n"
          :class="{ active: state.phase === n }"
          :disabled="!!previewPhase"
          @click="state.phase = n"
        >
          W{{ n }}
        </button>
      </div>
    </section>
    <section class="panel form-stack" aria-label="日期与计划预览">
      <button class="btn" :disabled="!!previewPhase" @click="customOpen = true">
        自定义当日计划
      </button>
      <div class="row wrap">
        <button class="btn" @click="shiftWeek(-1)">上一周</button>
        <label
          >训练日期<input
            type="date"
            :value="selectedDate"
            @change="selectDate($event.target.value)"
        /></label>
        <button class="btn" @click="shiftWeek(1)">下一周</button>
        <button class="btn" @click="returnToday">回到今天</button>
      </div>
      <label
        >只读阶段预览<select v-model="previewPhase">
          <option value="">当前阶段（可记录）</option>
          <option v-for="n in 4" :key="n" :value="String(n)">{{ PHASES[n].title }}</option>
        </select></label
      >
      <p v-if="previewPhase" class="info-box">
        正在只读预览，不能勾选或新增训练记录；退出预览后可记录。自定义周计划优先，不随预览改变。
      </p>
      <p class="tiny">
        {{ selectedDate }} ·
        {{ selectedWeek }} 起的一周。跨周沿用当前阶段，不自动推算或修改账号阶段。
      </p>
    </section>
    <div class="week-picker">
      <button
        v-for="n in 7"
        :key="n"
        :class="{ active: day === n, done: state.done[selectedWeek]?.[n] }"
        @click="day = n"
      >
        <span>周{{ WEEK_LABEL[n - 1] }}</span
        ><strong>{{ getPlan(n, selectedWeek, Number(previewPhase) || state.phase).label }}</strong
        ><span v-if="state.done[selectedWeek]?.[n]" class="day-indicator">✓ 已完成</span
        ><span v-else class="day-indicator">{{
          n === today && selectedWeek === week
            ? '今天'
            : getPlan(n, selectedWeek, Number(previewPhase) || state.phase).type === 'rest'
              ? '轻松恢复'
              : '力量训练'
        }}</span>
      </button>
    </div>
    <section v-if="view === 'week'" class="panel">
      <div class="section-heading">
        <h2>周{{ WEEK_LABEL[day - 1] }} · {{ plan.label }}</h2>
        <span class="pill">{{ selectedWeek }} 这一周</span>
      </div>
      <div class="two-col">
        <div v-for="s in ['am', 'pm']" :key="s">
          <h3 class="subheading">{{ s === 'am' ? '早训 · 主复合' : '晚训 · 辅助' }}</h3>
          <div v-for="ex in plan[s]" :key="ex.name" class="exercise-mini">
            <label
              ><input
                type="checkbox"
                :disabled="!!previewPhase"
                :checked="isChecked(day, s, ex.name, selectedWeek)"
                @change="toggleCheck(day, s, ex.name, $event.target.checked, selectedWeek)"
              />{{ ex.name }}</label
            ><span>{{ ex.sets }} × {{ ex.reps }}</span>
          </div>
        </div>
      </div>
      <button class="btn primary" @click="view = 'today'">
        进入当日训练<Icon name="arrow" :size="16" />
      </button>
    </section>
    <section v-else class="panel">
      <div class="section-heading">
        <div>
          <h2>周{{ WEEK_LABEL[day - 1] }} · {{ plan.label }}</h2>
          <p>先热身，再开始。保持动作可控。</p>
        </div>
        <div class="segmented">
          <button :class="{ active: session === 'am' }" @click="session = 'am'">早训</button
          ><button :class="{ active: session === 'pm' }" @click="session = 'pm'">晚训</button>
        </div>
      </div>
      <div class="exercise-list">
        <div
          v-for="(ex, i) in exercises"
          :key="ex.name"
          class="exercise-row"
          :class="{ completed: isChecked(day, session, ex.name, selectedWeek) }"
        >
          <label class="exercise-check"
            ><input
              type="checkbox"
              :aria-label="'完成' + ex.name"
              :disabled="!!previewPhase"
              :checked="isChecked(day, session, ex.name, selectedWeek)"
              @change="
                toggleCheck(day, session, ex.name, $event.target.checked, selectedWeek)
              " /></label
          ><span class="exercise-no">{{ String(i + 1).padStart(2, '0') }}</span>
          <div class="exercise-body">
            <h3>{{ ex.name }}</h3>
            <p>{{ ex.note }}</p>
            <span class="mobile-reps">{{ ex.sets }} 组 × {{ ex.reps }}</span>
          </div>
          <div class="exercise-target">
            <strong>{{ ex.sets }} <small>组</small></strong
            ><span>{{ ex.reps }} 次 / 时长</span>
          </div>
          <div class="exercise-actions">
            <button class="icon-btn" :aria-label="ex.name + '教学视频'" @click="openVideo(ex.name)">
              <Icon name="video" :size="18" /></button
            ><button class="btn small-btn" :disabled="!!previewPhase" @click="openLog(ex)">
              <Icon name="plus" :size="15" />记录
            </button>
          </div>
        </div>
      </div>
      <div class="row between wrap">
        <p class="muted">
          本时段已记录 {{ (state.logs[sessionKey(day, session, selectedWeek)] || []).length }} 条 ·
          勾选表示完成
        </p>
        <button class="btn primary" :disabled="!!previewPhase" @click="complete">
          <Icon name="check" :size="17" />完成本时段
        </button>
      </div>
    </section></template
  >
  <section v-else class="panel">
    <div class="section-heading">
      <h2>训练足迹</h2>
      <span class="pill">{{ history.reduce((n, [, e]) => n + e.length, 0) }} 条记录</span>
    </div>
    <div class="row wrap">
      <label>开始日期<input v-model="historyFrom" type="date" /></label
      ><label>结束日期<input v-model="historyTo" type="date" /></label
      ><label>搜索训练动作<input v-model="historyAction" type="search" maxlength="128" /></label
      ><button class="btn" @click="clearHistoryFilters">清空筛选</button>
    </div>
    <p v-if="historyFrom && historyTo && historyFrom > historyTo" class="alert">
      开始日期不能晚于结束日期。
    </p>
    <div v-if="!history.length" class="empty-state">
      <Icon name="training" :size="40" />
      <h3>从第一组开始</h3>
      <p>训练后记下重量、组数、次数和 RPE，留住每一次进步。</p>
      <button class="btn primary" @click="router.replace({ query: { view: 'today' } })">
        开始记录
      </button>
    </div>
    <article v-for="[key, entries] in history" :key="key" class="history-group">
      <h3>
        {{ key.split('|')[0] }} 这一周 · 周{{
          WEEK_LABEL[Number(key.split('|')[1].split('-')[0]) - 1]
        }}
        · {{ key.endsWith('am') ? '早训' : '晚训' }}
      </h3>
      <div v-for="entry in entries" :key="entry.id" class="history-row">
        <div class="record-content">
          <strong>{{ entry.name }}</strong>
          <span v-if="entry.is_demo || ['ai', 'demo'].includes(entry.source)" class="pill orange"
            >演示来源 · 非真实动作分析</span
          >
          <p>
            {{ entry.weight }} kg / 自重 · {{ entry.sets }} 组 × {{ entry.reps }} · RPE
            {{ entry.rpe }}
          </p>
          <p v-if="entry.note" class="training-note">{{ entry.note }}</p>
          <div v-if="entry.photos?.length" class="record-photos">
            <button
              v-for="(photo, index) in entry.photos"
              :key="index"
              class="record-photo"
              :aria-label="'查看训练图片 ' + (index + 1)"
              @click="photoPreview = photo"
            >
              <img
                v-if="photoUrl(photo)"
                :src="photoUrl(photo)"
                :alt="entry.name + '训练图片 ' + (index + 1)"
                loading="lazy"
              />
            </button>
          </div>
        </div>
        <div class="row">
          <button class="icon-btn" aria-label="编辑记录" @click="openLog(entry, entry, key)">
            <Icon name="edit" :size="17" /></button
          ><button
            class="icon-btn danger"
            aria-label="删除记录"
            @click="deleteTarget = { key, id: entry.id }"
          >
            <Icon name="trash" :size="17" />
          </button>
        </div>
      </div>
    </article>
    <button v-if="allHistory.length > historyLimit" class="btn full" @click="historyLimit += 20">
      加载更多训练记录
    </button>
  </section>
  <Modal
    v-if="edit"
    :title="(edit.id ? '编辑' : '记录') + ' · ' + form.name"
    @close="!saving && !preparing && (edit = null)"
    ><p class="muted">记录实际完成的数据，而不是目标值。</p>
    <div v-if="previous()" class="info-box">
      上次：{{ previous().weight }} · {{ previous().sets }} × {{ previous().reps }} · RPE
      {{ previous().rpe }}
    </div>
    <form class="form-stack" @submit.prevent="submit($event.submitter?.value === 'continue')">
      <label
        >重量（kg；留空为自重）<input
          data-log-weight
          v-model="form.weight"
          placeholder="例如 16 或辅助"
      /></label>
      <div class="two-col">
        <label>组数<input v-model="form.sets" required placeholder="3" /></label
        ><label
          >次数 / 时长<input v-model="form.reps" required placeholder="例如 6 或 30 秒"
        /></label>
      </div>
      <label
        >RPE · 主观用力程度<input
          v-model="form.rpe"
          type="number"
          min="1"
          max="10"
          step="0.5"
          placeholder="1–10"
      /></label>
      <label
        >训练心得<textarea
          v-model="form.note"
          rows="4"
          maxlength="2000"
          placeholder="今天的状态、动作感受，或下次想改进的地方…"
        ></textarea
        ><span class="tiny">{{ form.note.length }} / 2000</span></label
      >
      <div>
        <div class="section-heading">
          <h3>训练图片</h3>
          <span class="tiny">{{ form.photos.length }} / 3 张</span>
        </div>
        <div class="record-photos">
          <div v-for="(photo, index) in form.photos" :key="index" class="photo-editor">
            <img :src="photoUrl(photo)" :alt="'待保存训练图片 ' + (index + 1)" /><button
              type="button"
              class="icon-btn"
              :disabled="saving || preparing"
              :aria-label="'移除图片 ' + (index + 1)"
              @click="removePhoto(index)"
            >
              <Icon name="close" :size="15" />
            </button>
          </div>
        </div>
        <div v-for="(status, index) in photoStates" :key="index" class="tiny" aria-live="polite">
          图片 {{ index + 1 }}：{{ demoMode ? '本机保存' : status.status }}
          <progress
            v-if="status.status === '上传中'"
            :value="status.progress"
            max="100"
            :aria-label="'图片 ' + (index + 1) + ' 上传进度'"
          ></progress>
          <span v-if="status.status === '上传中'">{{ status.progress }}% · 等待服务器确认</span>
          <span v-if="status.error" role="alert">{{ status.error }}</span>
          <button
            v-if="status.status === '上传失败'"
            class="btn small-btn"
            type="button"
            :disabled="saving"
            @click="retryPhoto(index)"
          >
            重试图片 {{ index + 1 }}
          </button>
        </div>
        <label v-if="form.photos.length < 3" class="btn photo-picker"
          ><Icon name="upload" :size="16" />{{ preparing ? '正在压缩图片…' : '添加训练图片'
          }}<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            :disabled="preparing || saving"
            aria-label="添加训练图片"
            @change="addPhotos"
        /></label>
        <p class="tiny">最多三张，每张不超过 8MB，保存前会压缩。支持相册选择或手机拍照。</p>
        <p v-if="photoUsage" class="tiny">
          账号图片空间：{{ (photoUsage.used_bytes / 1024 / 1024).toFixed(2) }} /
          {{ photoUsage.limit_bytes / 1024 / 1024 }} MB
        </p>
        <p v-if="photoUsageError" class="tiny">{{ photoUsageError }}</p>
      </div>
      <button class="btn primary full" type="submit" :disabled="saving || preparing">
        {{ saving ? '正在保存…' : '保存记录' }}
      </button>
      <button class="btn full" type="submit" value="continue" :disabled="saving || preparing">
        保存并继续下一组
      </button>
      <p class="tiny">
        连续录入保留动作、重量、次数与 RPE，下一条默认 1 组；Tab
        切换字段。保存到本机后，账号同步状态见页面顶部。
      </p>
    </form></Modal
  >
  <Modal v-if="video" :title="video + ' · 动作教学'" @close="video = null"
    ><div v-for="(v, i) in videos" :key="i" class="resource-row">
      <Icon name="play" /><a
        v-if="safeUrl(v.url)"
        :href="safeUrl(v.url)"
        target="_blank"
        rel="noopener noreferrer"
        >{{ v.title }} ↗</a
      ><button v-if="bvid(v.url)" class="btn small-btn" @click="playVideo(v)">
        内嵌试播</button
      ><button
        v-if="i === 0 && state.videos[video]"
        class="icon-btn"
        aria-label="移除自定义视频"
        @click="delete state.videos[video]"
      >
        <Icon name="trash" :size="16" />
      </button>
    </div>
    <iframe
      v-if="playingEmbed"
      class="embedded-video"
      :src="playingEmbed"
      title="B站动作教学视频"
      allow="fullscreen"
      referrerpolicy="no-referrer"
      allowfullscreen
    ></iframe>
    <p v-if="playingEmbed" class="info-box">
      若播放器空白、视频失效或被限制，请使用上方原链接查看；也可在下方重新绑定视频。链接格式校验不能保证远端可播放。
    </p>
    <p v-if="!videos.length" class="muted">还没有教学视频，可以绑定自己的链接。</p>
    <form class="form-stack" @submit.prevent="bindVideo">
      <label>视频标题<input v-model="videoTitle" placeholder="动作示范" /></label
      ><label
        >视频链接<input v-model="videoUrl" type="url" required placeholder="https://…" /></label
      ><button class="btn primary" type="submit">保存视频链接</button>
    </form></Modal
  >
  <Modal v-if="photoPreview" title="训练图片" @close="photoPreview = ''"
    ><img class="training-photo-preview" :src="photoUrl(photoPreview)" alt="训练记录图片大图"
  /></Modal>
  <Modal v-if="deleteTarget" title="删除这条训练记录？" @close="deleteTarget = null"
    ><p>删除后无法恢复，其他训练记录会保留。</p>
    <div class="modal-actions">
      <button class="btn" @click="deleteTarget = null">取消</button
      ><button class="btn destructive" @click="removeLog">确认删除</button>
    </div></Modal
  >
  <Modal v-if="libraryOpen" title="内置动作库" @close="libraryOpen = false"
    ><ExerciseLibrary :read-only="!!previewPhase" @use="chooseLibrary"
  /></Modal>
  <Modal v-if="customOpen" title="自定义训练计划" @close="closeCustom"
    ><CustomPlan
      :day="day"
      :week="selectedWeek"
      :seed="customSeed"
      :session="session"
      @close="closeCustom"
  /></Modal>
</template>
