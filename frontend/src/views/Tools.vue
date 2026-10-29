<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import Icon from '../components/Icon.vue'
import { state, saveLog, today, notify, uid } from '../store'
import { AI_MOCK, PLAN } from '../data'
const exercise = ref('哑铃深蹲'),
  file = ref(null),
  url = ref(''),
  player = ref(null),
  result = ref(null),
  busy = ref(false),
  timer = ref(null),
  error = ref('')
const names = [
  ...new Set(Object.values(PLAN).flatMap((d) => [...d.am, ...d.pm].map((e) => e.name))),
]
const previous = computed(() =>
  result.value
    ? state.ai.find(
        (r) =>
          r.exercise === result.value.exercise &&
          r.eval_id !== result.value.eval_id &&
          new Date(r.created_at) < new Date(result.value.created_at),
      )
    : null,
)
function pick(e) {
  const f = e.target.files[0]
  if (!f) return
  if (!f.type.startsWith('video/') || f.size > 100 * 1024 * 1024) {
    error.value = '请选择 100MB 以内的视频'
    e.target.value = ''
    return
  }
  error.value = ''
  if (url.value) URL.revokeObjectURL(url.value)
  file.value = f
  url.value = URL.createObjectURL(f)
  result.value = null
}
function submit() {
  busy.value = true
  timer.value = setTimeout(() => {
    const r = {
      ...structuredClone(AI_MOCK),
      eval_id: uid(),
      exercise: exercise.value,
      created_at: new Date().toISOString(),
      file_name: file.value?.name || '演示视频',
      source: 'demo',
      is_demo: true,
    }
    state.ai.unshift(r)
    result.value = state.ai[0]
    busy.value = false
  }, 800)
}
function seek(t) {
  if (player.value) {
    player.value.currentTime = t
    player.value.play().catch(() => {})
  } else notify('选择本地视频后可跳转时间点')
}
function save() {
  saveLog(today, 'am', {
    name: result.value.exercise,
    weight: '自重',
    sets: '1',
    reps: String(result.value.reps),
    rpe: '—',
    source: 'demo',
    is_demo: true,
    note: '动作实验室演示次数，未经真实动作识别验证',
    evaluation_id: result.value.eval_id,
  })
  result.value.saved = true
}
onBeforeUnmount(() => {
  clearTimeout(timer.value)
  if (url.value) URL.revokeObjectURL(url.value)
})
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">QUALITY BEFORE QUANTITY</div>
      <h1>先把动作，练漂亮<span class="green-dot">.</span></h1>
      <p>回看每一次发力，让标准动作成为习惯。</p>
    </div>
    <span class="pill orange">AI 演示体验</span>
  </div>
  <div class="two-col align-start">
    <section class="panel">
      <div class="section-heading">
        <h2>动作评估</h2>
        <Icon name="tools" />
      </div>
      <label class="form-label"
        >训练动作<select v-model="exercise">
          <option v-for="name in names" :key="name">{{ name }}</option>
        </select></label
      ><label class="upload-area video-upload"
        ><input type="file" accept="video/*" @change="pick" /><Icon
          name="video"
          :size="40"
        /><strong>{{ file?.name || '选择你的训练视频' }}</strong
        ><span>本地预览 · 最大 100MB · 不会上传</span></label
      >
      <p v-if="error" class="alert">{{ error }}</p>
      <video v-if="url" ref="player" :src="url" controls class="video-player"></video>
      <div class="info-box">
        原型暂未接入 AI 服务。以下为固定示范评估，不代表所选视频的真实动作质量。
      </div>
      <button class="btn primary full" :disabled="busy" @click="submit">
        {{ busy ? '正在生成示范评估…' : '体验动作评估演示' }}
      </button>
    </section>
    <section class="panel">
      <div class="section-heading">
        <h2>评估报告</h2>
        <span class="pill">{{ result ? '示范结果' : '等待开始' }}</span>
      </div>
      <div v-if="!result" class="empty-state">
        <Icon name="target" :size="48" />
        <h3>动作质量，比数字更重要</h3>
        <p>选择一个动作，体验评估报告与关键帧提示。</p>
      </div>
      <template v-else
        ><div class="assessment-score">
          <strong>{{ result.score }}</strong
          ><span>/ 100<br />示范分数 · {{ result.reps }} 次动作</span>
        </div>
        <div v-if="previous" class="info-box">
          上次同动作 {{ previous.score }} 分 · 本次变化
          {{ result.score - previous.score >= 0 ? '+' : ''
          }}{{ result.score - previous.score }} 分（示范数据）
        </div>
        <h3>{{ result.exercise }}</h3>
        <p>{{ result.summary }}</p>
        <div v-for="issue in result.issues" :key="issue.timestamp" class="issue-card">
          <button class="pill" @click="seek(issue.timestamp)">
            <Icon name="play" :size="12" />{{ issue.timestamp }}s
          </button>
          <h3>{{ issue.problem }}</h3>
          <p>{{ issue.fix }}</p>
        </div>
        <p class="info-box">
          写入的是固定演示次数，不代表所选视频的真实识别结果；训练记录会保留演示来源。
        </p>
        <button class="btn primary full" :disabled="result.saved" @click="save">
          {{ result.saved ? '已写入训练记录' : '将示范次数写入训练记录' }}
        </button></template
      >
    </section>
  </div>
  <section class="panel">
    <div class="section-heading">
      <h2>历史评估</h2>
      <span class="pill">{{ state.ai.length }} 次</span>
    </div>
    <p v-if="!state.ai.length" class="empty-state">你的动作复盘，会从这里开始。</p>
    <div v-for="r in state.ai" :key="r.eval_id" class="history-row">
      <div>
        <strong>{{ r.exercise }}</strong>
        <p>{{ new Date(r.created_at).toLocaleString('zh-CN') }} · {{ r.file_name }} · 演示</p>
      </div>
      <button class="btn small-btn" @click="result = r">{{ r.score }} 分 · 查看</button>
    </div>
  </section>
</template>
