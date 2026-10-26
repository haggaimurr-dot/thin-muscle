<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
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
} from '../store'
import { PHASES, WEEK_LABEL, VIDEO_LIB } from '../data'
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
  playingBvid = ref('')
watch(
  () => route.query.view,
  (v) => {
    view.value = v || 'today'
  },
)
const form = ref({}),
  plan = computed(() => getPlan(day.value)),
  exercises = computed(() =>
    plan.value[session.value].map((e) => ({
      ...e,
      sets:
        session.value === 'pm' &&
        state.phase > 1 &&
        !e.noSets &&
        !e.timed &&
        (e.sets === 3 || e.sets === '3–4')
          ? 4
          : e.sets,
    })),
  )
const history = computed(() =>
  Object.entries(state.logs)
    .filter(([, entries]) => entries.length)
    .sort(([a], [b]) => b.localeCompare(a)),
)
function openLog(ex, entry = null, key = null) {
  const parts = key?.split('|')[1].split('-')
  edit.value = {
    day: parts ? Number(parts[0]) : day.value,
    session: parts ? parts[1] : session.value,
    id: entry?.id,
    week: key?.split('|')[0] || week,
  }
  form.value = {
    name: ex.name,
    weight: entry?.weight || '',
    sets: entry?.sets || String(ex.sets || 3),
    reps: entry?.reps || '',
    rpe: entry?.rpe === '—' ? '' : entry?.rpe || 7,
  }
}
function submit() {
  saveLog(
    edit.value.day,
    edit.value.session,
    { ...form.value, weight: form.value.weight || '自重', rpe: form.value.rpe || '—' },
    edit.value.id,
    edit.value.week,
  )
  edit.value = null
}
function complete() {
  for (const ex of exercises.value) toggleCheck(day.value, session.value, ex.name, true)
  notify('本时段训练已完成')
}
function openVideo(name) {
  video.value = name
  playingBvid.value = ''
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
    if (!['www.bilibili.com', 'bilibili.com'].includes(u.hostname)) return ''
    return u.pathname.match(/\/video\/(BV[A-Za-z0-9]+)/)?.[1] || ''
  } catch {
    return ''
  }
}
function bindVideo() {
  const url = safeUrl(videoUrl.value)
  if (!url) {
    notify('请输入有效的 HTTP 或 HTTPS 链接')
    return
  }
  state.videos[video.value] = [{ title: videoTitle.value || video.value, url }]
  notify('视频已绑定')
  videoUrl.value = ''
}
function removeLog() {
  const { key, id } = deleteTarget.value
  state.logs[key] = state.logs[key].filter((e) => e.id !== id)
  deleteTarget.value = null
  notify('记录已删除')
}
function previous() {
  if (!form.value.name) return null
  return history.value
    .flatMap(([key, entries]) => entries.map((e) => ({ ...e, key })))
    .find((e) => e.name === form.value.name && e.id !== edit.value?.id)
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
  <template v-if="view !== 'history'"
    ><section class="panel phase-panel">
      <div>
        <span class="eyebrow">4-WEEK PROGRAM</span>
        <h2>{{ PHASES[state.phase]?.title }}</h2>
        <p>{{ PHASES[state.phase]?.focus }}</p>
      </div>
      <div class="phase-picker">
        <button
          v-for="n in 4"
          :key="n"
          :class="{ active: state.phase === n }"
          @click="state.phase = n"
        >
          W{{ n }}
        </button>
      </div>
    </section>
    <div class="week-picker">
      <button
        v-for="n in 7"
        :key="n"
        :class="{ active: day === n, done: state.done[week]?.[n] }"
        @click="day = n"
      >
        <span>周{{ WEEK_LABEL[n - 1] }}</span
        ><strong>{{ getPlan(n).label }}</strong
        ><span v-if="state.done[week]?.[n]" class="day-indicator">✓ 已完成</span
        ><span v-else class="day-indicator">{{
          n === today ? '今天' : getPlan(n).type === 'rest' ? '轻松恢复' : '力量训练'
        }}</span>
      </button>
    </div>
    <section v-if="view === 'week'" class="panel">
      <div class="section-heading">
        <h2>周{{ WEEK_LABEL[day - 1] }} · {{ plan.label }}</h2>
        <span class="pill">{{ week }} 这一周</span>
      </div>
      <div class="two-col">
        <div v-for="s in ['am', 'pm']" :key="s">
          <h3 class="subheading">{{ s === 'am' ? '早训 · 主复合' : '晚训 · 辅助' }}</h3>
          <div v-for="ex in plan[s]" :key="ex.name" class="exercise-mini">
            <label
              ><input
                type="checkbox"
                :checked="isChecked(day, s, ex.name)"
                @change="toggleCheck(day, s, ex.name, $event.target.checked)"
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
          :class="{ completed: isChecked(day, session, ex.name) }"
        >
          <label class="exercise-check"
            ><input
              type="checkbox"
              :aria-label="'完成' + ex.name"
              :checked="isChecked(day, session, ex.name)"
              @change="toggleCheck(day, session, ex.name, $event.target.checked)" /></label
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
            ><button class="btn small-btn" @click="openLog(ex)">
              <Icon name="plus" :size="15" />记录
            </button>
          </div>
        </div>
      </div>
      <div class="row between wrap">
        <p class="muted">
          本时段已记录 {{ (state.logs[sessionKey(day, session)] || []).length }} 条 · 勾选表示完成
        </p>
        <button class="btn primary" @click="complete">
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
        <div>
          <strong>{{ entry.name }}</strong>
          <p>
            {{ entry.weight }} kg / 自重 · {{ entry.sets }} 组 × {{ entry.reps }} · RPE
            {{ entry.rpe }}
          </p>
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
  </section>
  <Modal v-if="edit" :title="(edit.id ? '编辑' : '记录') + ' · ' + form.name" @close="edit = null"
    ><p class="muted">记录实际完成的数据，而不是目标值。</p>
    <div v-if="previous()" class="info-box">
      上次：{{ previous().weight }} · {{ previous().sets }} × {{ previous().reps }} · RPE
      {{ previous().rpe }}
    </div>
    <form class="form-stack" @submit.prevent="submit">
      <label
        >重量（kg；留空为自重）<input v-model="form.weight" placeholder="例如 16 或辅助"
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
          placeholder="1–10" /></label
      ><button class="btn primary full" type="submit">保存记录</button>
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
      ><button v-if="bvid(v.url)" class="btn small-btn" @click="playingBvid = bvid(v.url)">
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
      v-if="playingBvid"
      class="embedded-video"
      :src="`https://player.bilibili.com/player.html?bvid=${playingBvid}&autoplay=0`"
      title="B站动作教学视频"
      allow="fullscreen"
      referrerpolicy="no-referrer"
      allowfullscreen
    ></iframe>
    <p v-if="!videos.length" class="muted">还没有教学视频，可以绑定自己的链接。</p>
    <form class="form-stack" @submit.prevent="bindVideo">
      <label>视频标题<input v-model="videoTitle" placeholder="动作示范" /></label
      ><label
        >视频链接<input v-model="videoUrl" type="url" required placeholder="https://…" /></label
      ><button class="btn primary" type="submit">保存视频链接</button>
    </form></Modal
  >
  <Modal v-if="deleteTarget" title="删除这条训练记录？" @close="deleteTarget = null"
    ><p>删除后无法恢复，其他训练记录会保留。</p>
    <div class="modal-actions">
      <button class="btn" @click="deleteTarget = null">取消</button
      ><button class="btn destructive" @click="removeLog">确认删除</button>
    </div></Modal
  >
</template>
