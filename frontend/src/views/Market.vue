<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import { api, demoMode } from '../api'
import { state, week, getPlan, notify, sessionKey } from '../store'
const tab = ref('browse'),
  kind = ref('all'),
  cycle = ref('all'),
  level = ref('all'),
  listings = ref([]),
  nodes = ref([]),
  loading = ref(false),
  error = ref(''),
  pending = ref(false),
  detail = ref(null),
  checkout = ref(false),
  ackWeight = ref(false),
  ackLevel = ref(false),
  comment = ref(''),
  nodeFilter = ref('all'),
  nodeDetail = ref(null),
  publish = ref(false)
const draft = ref({ title: '我的拼装方案', cycle: 'week', days: [] }),
  assembleWeight = ref(false),
  assembleLevel = ref(false)
const publishing = ref({
  kind: 'plan',
  title: '',
  level: '入门',
  price: 9.9,
  body_range: '60–75kg',
  body_text: '',
  cycle: 'week',
  topic: '',
  mediaUrl: '',
  mediaType: 'video',
  steps: '',
  cues: '',
  skill_tags: '',
})
const dayNames = { push: '推日', pull: '拉日', legs: '腿日', rest: '恢复日' }
const visibleNodes = computed(() =>
  nodes.value.filter((n) => nodeFilter.value === 'all' || n.kind === nodeFilter.value),
)
const plans = computed(() => nodes.value.filter((n) => n.kind === 'plan')),
  lessons = computed(() => nodes.value.filter((n) => n.kind === 'lesson'))
const yuan = (fen) => (fen / 100).toFixed(2)
let controller
async function load() {
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  error.value = ''
  try {
    const [l, n] = await Promise.all([
      api(
        `/market/listings?${new URLSearchParams({ kind: kind.value, cycle: cycle.value, level: level.value })}`,
        undefined,
        'GET',
        signal,
      ),
      api('/market/nodes', undefined, 'GET', signal),
    ])
    listings.value = l.items
    nodes.value = n.items
  } catch (e) {
    if (e.name !== 'AbortError') error.value = e.message
  } finally {
    if (!signal.aborted) loading.value = false
  }
}
watch([kind, cycle, level], load, { immediate: true })
onBeforeUnmount(() => controller?.abort())
async function action(fn) {
  if (pending.value) return
  pending.value = true
  try {
    await fn()
  } catch (e) {
    notify(e.message)
  } finally {
    pending.value = false
  }
}
async function open(p) {
  await action(async () => {
    const data = await api('/market/listings/' + p.listing_id)
    detail.value = data
    checkout.value = false
    comment.value = ''
    ackWeight.value = false
    ackLevel.value = false
  })
}
async function like() {
  await action(async () => {
    await api(`/market/listings/${detail.value.listing_id}/like`, {})
    detail.value = await api(`/market/listings/${detail.value.listing_id}`)
    await load()
  })
}
async function sendComment() {
  const text = comment.value.trim()
  if (!text) return
  await action(async () => {
    await api(`/market/listings/${detail.value.listing_id}/comments`, { text })
    detail.value = await api(`/market/listings/${detail.value.listing_id}`)
    comment.value = ''
  })
}
async function buy() {
  if (!ackWeight.value || !ackLevel.value) return
  await action(async () => {
    if (!demoMode) {
      const payment = await api('/payments/checkout/' + detail.value.listing_id, {
        ack_weight: true,
        ack_level: true,
      })
      window.location.assign(payment.url)
      return
    }
    await api(`/market/listings/${detail.value.listing_id}/replicate`, {
      ack_weight: true,
      ack_level: true,
    })
    await load()
    detail.value = null
    checkout.value = false
    tab.value = 'nodes'
    notify('已复刻到训练节点库，图文视频完整保留')
  })
}
function addPlan(node) {
  for (const d of node.days || []) {
    if (!['push', 'pull', 'legs', 'rest'].includes(d.day_type)) continue
    const copy = {
      day_type: d.day_type,
      session: d.session || 'both',
      exercises: d.exercises.map((e) => ({
        ...e,
        from_plan_node_id: node.node_id,
        lesson_node_id: null,
      })),
    }
    const i = draft.value.days.findIndex(
      (x) => x.day_type === d.day_type && x.session === copy.session,
    )
    if (i >= 0) draft.value.days[i] = copy
    else draft.value.days.push(copy)
  }
  assembleWeight.value = false
  assembleLevel.value = false
  tab.value = 'compose'
  notify('方案已添加，可按动作绑定教学')
}
async function assemble() {
  if (!assembleWeight.value || !assembleLevel.value) return
  await action(async () => {
    const data = await api('/market/assemble', {
      ...draft.value,
      ack_weight: true,
      ack_level: true,
    })
    state.plans[week] ??= {}
    for (const d of draft.value.days) {
      const days =
        d.day_type === 'rest' ? [2, 4, 6, 7] : [{ push: 1, pull: 3, legs: 5 }[d.day_type]]
      for (const weekday of days) {
        const base = structuredClone(
          JSON.parse(JSON.stringify(state.plans[week][weekday] || getPlan(weekday))),
        )
        const exercises = d.exercises.map((e) => ({
          ...e,
          note: e.notes || '',
          load: e.load || '',
        }))
        if (d.session === 'both') {
          const mid = Math.ceil(exercises.length / 2)
          base.am = exercises.slice(0, mid)
          base.pm = exercises.slice(mid)
        } else base[d.session] = exercises
        state.plans[week][weekday] = base
      }
    }
    assembleWeight.value = false
    assembleLevel.value = false
    notify(data.message || '已应用到本周训练')
  })
}
function safeUrl(value) {
  try {
    const u = new URL(value)
    return ['http:', 'https:'].includes(u.protocol) ? u.href : null
  } catch {
    return null
  }
}
function currentDays() {
  return [1, 3, 5]
    .flatMap((day) =>
      ['am', 'pm'].map((session) => ({
        day_type: { 1: 'push', 3: 'pull', 5: 'legs' }[day],
        session,
        exercises: getPlan(day)[session].map((e) => {
          const log = (state.logs[sessionKey(day, session)] || [])
            .filter((l) => l.name === e.name)
            .at(-1)
          return {
            name: e.name,
            sets: log?.sets || e.sets,
            reps: String(log?.reps || e.reps),
            notes: e.note || '',
            load: log?.weight || e.load || '',
          }
        }),
      })),
    )
    .filter((d) => d.exercises.length)
}
async function publishListing() {
  await action(async () => {
    const p = publishing.value
    const url = p.mediaUrl ? safeUrl(p.mediaUrl) : null
    if (p.mediaUrl && !url) throw new Error('请输入有效的媒体链接')
    const media = url ? [{ type: p.mediaType, url, title: p.title }] : []
    const body = {
      kind: p.kind,
      title: p.title.trim(),
      level: p.level,
      body_range: p.body_range,
      body_text: p.body_text,
      price_fen: Math.round(p.price * 100),
      media,
    }
    if (p.kind === 'plan')
      Object.assign(body, {
        cycle: p.cycle,
        days: currentDays(),
        rhythm: '周一推 / 周三拉 / 周五腿，其余恢复',
      })
    else {
      if (!media.length) throw new Error('教学至少需要一条示范媒体')
      Object.assign(body, {
        topic: p.topic,
        steps: p.steps.split('\n').filter(Boolean),
        cues: p.cues.split('\n').filter(Boolean),
        skill_tags: p.skill_tags.split(/[，,]/).filter(Boolean),
        demo_media: media,
      })
    }
    await api('/market/listings', body)
    publish.value = false
    await load()
    notify('作品已上架')
  })
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">GOOD PLANS, GREAT PROGRESS</div>
      <h1>让好方法，流动起来<span class="green-dot">.</span></h1>
      <p>发现训练方案与动作教学，拼出适合自己的训练节奏。</p>
    </div>
    <button class="btn primary" @click="publish = true">
      <Icon name="plus" :size="17" />发布作品
    </button>
  </div>
  <div class="tabs">
    <button
      v-for="[id, label] in [
        ['browse', '发现好方案'],
        ['nodes', '我的训练节点'],
        ['compose', '拼装训练方案'],
      ]"
      :key="id"
      :class="{ active: tab === id }"
      @click="tab = id"
    >
      {{ label }}
    </button>
  </div>
  <div v-if="error" class="alert">
    市场加载失败：{{ error }} <button class="text-link" @click="load">重试</button>
  </div>
  <p v-if="loading" class="loading-state">正在加载训练资源…</p>
  <template v-if="tab === 'browse'"
    ><div class="market-banner">
      <div>
        <span class="eyebrow">BUILD YOUR OWN ROUTINE</span>
        <h2>好的训练，<br />从适合你的方案开始。</h2>
        <p>方案负责负荷，教学帮你练得更标准。</p>
      </div>
      <div class="market-banner-art" aria-hidden="true">
        <Icon name="layers" :size="115" :stroke-width="1" />
      </div>
    </div>
    <div class="filter-bar">
      <div class="filter-chips">
        <button
          v-for="[id, label] in [
            ['all', '全部作品'],
            ['plan', '训练方案'],
            ['lesson', '动作教学'],
          ]"
          :key="id"
          class="chip"
          :class="{ active: kind === id }"
          @click="kind = id"
        >
          {{ label }}
        </button>
      </div>
      <div class="row wrap">
        <select v-model="cycle" aria-label="周期筛选">
          <option value="all">全部周期</option>
          <option value="week">周计划</option>
          <option value="month">月计划</option>
          <option value="full">全程计划</option></select
        ><select v-model="level" aria-label="水平筛选">
          <option value="all">全部水平</option>
          <option>入门</option>
          <option>进阶</option>
        </select>
      </div>
    </div>
    <div v-if="!loading && !error && !listings.length" class="panel empty-state">
      <Icon name="search" :size="38" />
      <h3>暂时没有符合筛选的作品</h3>
      <button
        class="btn"
        @click="
          () => {
            kind = 'all'
            cycle = 'all'
            level = 'all'
          }
        "
      >
        清除筛选
      </button>
    </div>
    <div class="market-grid">
      <button
        v-for="(p, i) in listings"
        :key="p.listing_id"
        class="product-card"
        :disabled="pending"
        @click="open(p)"
      >
        <div class="product-art" :class="[p.kind, 'color-' + (i % 3)]">
          <span class="product-category">{{
            p.kind === 'plan' ? 'TRAINING PLAN' : 'MOVEMENT GUIDE'
          }}</span
          ><Icon :name="p.kind === 'plan' ? 'training' : 'play'" :size="72" /><span
            class="product-art-label"
            >{{ p.kind === 'plan' ? 'BUILD YOUR STRENGTH.' : 'MASTER YOUR MOVEMENT.' }}</span
          ><span class="product-level">{{ p.level }}</span>
        </div>
        <div class="product-body">
          <span class="tiny green-text">{{
            p.kind === 'plan'
              ? ({ week: '周', month: '月', full: '全程' }[p.cycle] || '') + '训练方案'
              : '动作教学'
          }}</span>
          <h3>{{ p.title }}</h3>
          <p>{{ p.user }} · {{ p.body_range || '体重区间未标注' }}</p>
          <div class="row between">
            <span class="muted row"><Icon name="heart" :size="15" />{{ p.likes || 0 }}</span
            ><strong class="price">¥{{ yuan(p.price_fen) }}<small>复刻</small></strong>
          </div>
        </div>
      </button>
    </div></template
  >
  <template v-if="tab === 'nodes'"
    ><div class="section-heading">
      <div>
        <h2>你的训练资源库</h2>
        <p>复刻的图文、音频和视频都会保留在这里。</p>
      </div>
      <select v-model="nodeFilter" aria-label="节点类型筛选">
        <option value="all">全部节点</option>
        <option value="plan">训练方案</option>
        <option value="lesson">动作教学</option>
      </select>
    </div>
    <div v-if="!visibleNodes.length && !loading" class="panel empty-state">
      <Icon name="layers" :size="40" />
      <h3>让好方案成为你的训练</h3>
      <p>在市场复刻后，即可在这里查看和拼装。</p>
      <button class="btn primary" @click="tab = 'browse'">去发现方案</button>
    </div>
    <div class="market-grid">
      <article v-for="n in visibleNodes" :key="n.node_id" class="panel node-card">
        <span class="metric-icon" :class="n.kind === 'plan' ? 'green' : 'orange'"
          ><Icon :name="n.kind === 'plan' ? 'training' : 'video'" /></span
        ><span class="pill">{{ n.kind === 'plan' ? '训练方案' : '动作教学' }}</span>
        <h3>{{ n.title }}</h3>
        <p>{{ n.level }} · {{ n.body_range }}</p>
        <div class="row wrap">
          <button class="btn small-btn" @click="nodeDetail = n">查看内容</button
          ><button v-if="n.kind === 'plan'" class="btn primary small-btn" @click="addPlan(n)">
            拼入方案<Icon name="plus" :size="15" /></button
          ><button
            v-else
            class="btn primary small-btn"
            @click="
              () => {
                tab = 'compose'
                notify('在具体动作的教学下拉框中选择此教学')
              }
            "
          >
            绑定到动作
          </button>
        </div>
      </article>
    </div></template
  >
  <template v-if="tab === 'compose'"
    ><div class="two-col align-start">
      <section class="panel">
        <div class="section-heading">
          <h2>我的拼装方案</h2>
          <Icon name="layers" />
        </div>
        <div class="form-stack">
          <label>方案名称<input v-model="draft.title" maxlength="128" /></label
          ><label
            >周期<select v-model="draft.cycle">
              <option value="week">周计划</option>
              <option value="month">月计划</option>
              <option value="full">全程计划</option>
            </select></label
          >
        </div>
        <p v-if="!draft.days.length" class="empty-state">
          从右侧节点库添加一个训练方案，再为具体动作绑定教学。
        </p>
        <div v-for="(d, di) in draft.days" :key="di" class="compose-day">
          <div class="section-heading">
            <h3>
              {{ dayNames[d.day_type] }} · {{ { am: '早训', pm: '晚训', both: '全天' }[d.session] }}
            </h3>
            <button class="icon-btn" aria-label="移除此训练日" @click="draft.days.splice(di, 1)">
              <Icon name="trash" :size="16" />
            </button>
          </div>
          <div v-for="(ex, ei) in d.exercises" :key="ei" class="compose-exercise">
            <strong>{{ ex.name }}</strong>
            <div class="three-col">
              <label>组数<input v-model="ex.sets" /></label
              ><label>次数<input v-model="ex.reps" /></label
              ><label>重量<input v-model="ex.load" placeholder="自重" /></label>
            </div>
            <label class="form-label"
              >动作教学<select v-model="ex.lesson_node_id">
                <option :value="null">不绑定教学</option>
                <option v-for="l in lessons" :key="l.node_id" :value="l.node_id">
                  {{ l.title }}
                </option>
              </select></label
            >
          </div>
        </div>
        <div class="consents">
          <label
            ><input
              v-model="assembleWeight"
              type="checkbox"
            />我确认体重符合所选方案的适配区间</label
          ><label><input v-model="assembleLevel" type="checkbox" />我确认训练水平与方案匹配</label>
        </div>
        <button
          class="btn primary full"
          :disabled="
            pending ||
            !assembleWeight ||
            !assembleLevel ||
            !draft.days.some((d) => d.day_type !== 'rest') ||
            !draft.title.trim()
          "
          @click="assemble"
        >
          应用到本周训练<Icon name="arrow" :size="16" /></button
        ><RouterLink to="/training?view=week" class="text-link centered"
          >查看我的每周计划</RouterLink
        >
      </section>
      <section class="panel">
        <h2>可用方案节点</h2>
        <p class="muted">教学只绑定到具体动作，不会代替负荷方案。</p>
        <div v-for="p in plans" :key="p.node_id" class="history-row">
          <div>
            <strong>{{ p.title }}</strong>
            <p>{{ p.level }} · {{ p.body_range }}</p>
          </div>
          <button class="btn small-btn" @click="addPlan(p)">添加</button>
        </div>
        <div v-if="!plans.length" class="empty-state">
          <p>还没有可拼装的方案。</p>
          <button class="btn" @click="tab = 'browse'">去市场复刻</button>
        </div>
      </section>
    </div></template
  >
  <Modal v-if="detail" :title="checkout ? '复刻确认' : detail.title" @close="detail = null"
    ><template v-if="!checkout"
      ><div class="row wrap">
        <span class="pill green">{{ detail.kind === 'plan' ? '训练方案' : '动作教学' }}</span
        ><span class="muted">{{ detail.user }} · {{ detail.level }} · {{ detail.body_range }}</span>
      </div>
      <p class="detail-description">{{ detail.body_text }}</p>
      <template v-if="detail.kind === 'plan'"
        ><div v-for="(d, i) in detail.days" :key="i" class="detail-day">
          <h3>{{ dayNames[d.day_type] }} · {{ d.session }}</h3>
          <div v-for="(ex, j) in d.exercises" :key="j" class="exercise-mini">
            <strong>{{ ex.name }}</strong
            ><span>{{ ex.load || '自重' }} · {{ ex.sets }} × {{ ex.reps }}</span>
          </div>
        </div></template
      ><template v-else
        ><h3>{{ detail.topic }}</h3>
        <ol class="text-list">
          <li v-for="(s, i) in detail.steps" :key="i">{{ s }}</li>
        </ol>
        <ul class="text-list">
          <li v-for="(s, i) in detail.cues" :key="i">{{ s }}</li>
        </ul></template
      >
      <div class="resource-links">
        <a
          v-for="(m, i) in [...(detail.media || []), ...(detail.demo_media || [])]"
          :key="i"
          :href="safeUrl(m.url) || undefined"
          target="_blank"
          rel="noopener noreferrer"
          >{{ m.title || m.type }} ↗</a
        >
      </div>
      <div class="section-heading">
        <h3>留言</h3>
        <button class="text-link" :disabled="pending" @click="like">
          <Icon name="heart" :size="17" />{{ detail.liked_by_me ? '已赞' : '点赞' }} ·
          {{ detail.likes }}
        </button>
      </div>
      <p v-if="!detail.comments.length" class="muted">还没有留言，分享你的想法吧。</p>
      <div v-for="c in detail.comments" :key="c.id" class="comment-row">
        <strong>{{ c.user }}</strong
        ><span>{{ c.text }}</span>
      </div>
      <form class="row comment-form" @submit.prevent="sendComment">
        <input
          v-model="comment"
          required
          maxlength="500"
          aria-label="商品留言"
          placeholder="说说你的想法…"
        /><button class="btn" :disabled="pending" type="submit">发送</button>
      </form>
      <button
        class="btn primary full"
        @click="detail.bought_by_me ? ((detail = null), (tab = 'nodes')) : (checkout = true)"
      >
        {{
          detail.bought_by_me
            ? '查看已复刻节点'
            : '¥' + yuan(detail.price_fen) + ' · 复刻到我的节点'
        }}
      </button></template
    ><template v-else
      ><h3>{{ detail.title }}</h3>
      <div class="info-box">
        {{
          demoMode
            ? '当前为开发演示，不调用真实支付。'
            : '将跳转至支付平台。付款后返回并刷新节点库；仅在服务端收到支付确认后开放内容。'
        }}
      </div>
      <div class="price-breakdown">
        <div>
          <span>复刻价格</span><strong>¥{{ yuan(detail.price_fen) }}</strong>
        </div>
        <div>
          <span>创作者收益</span
          ><span>¥{{ yuan(detail.price_fen - Math.round(detail.price_fen * 0.15)) }}</span>
        </div>
        <div>
          <span>平台服务费 · 15%</span><span>¥{{ yuan(Math.round(detail.price_fen * 0.15)) }}</span>
        </div>
      </div>
      <div class="consents">
        <label
          ><input v-model="ackWeight" type="checkbox" />我确认体重适配（{{
            detail.body_range || '按自身情况确认'
          }}）</label
        ><label
          ><input v-model="ackLevel" type="checkbox" />我确认训练水平匹配（{{
            detail.level
          }}）</label
        >
      </div>
      <button class="btn primary full" :disabled="pending || !ackWeight || !ackLevel" @click="buy">
        {{
          pending
            ? '正在复刻…'
            : (demoMode ? '确认演示复刻 · ¥' : '前往支付 · ¥') + yuan(detail.price_fen)
        }}
      </button></template
    ></Modal
  >
  <Modal v-if="nodeDetail" :title="nodeDetail.title" @close="nodeDetail = null"
    ><p>{{ nodeDetail.body_text }}</p>
    <div v-for="(d, i) in nodeDetail.days || []" :key="i" class="detail-day">
      <h3>{{ dayNames[d.day_type] }} · {{ d.session }}</h3>
      <p v-for="(ex, j) in d.exercises" :key="j">{{ ex.name }} · {{ ex.sets }} × {{ ex.reps }}</p>
    </div>
    <h3 v-if="nodeDetail.topic">{{ nodeDetail.topic }}</h3>
    <ol class="text-list">
      <li v-for="(step, i) in nodeDetail.steps || []" :key="i">{{ step }}</li>
    </ol>
    <ul class="text-list">
      <li v-for="(cue, i) in nodeDetail.cues || []" :key="i">{{ cue }}</li>
    </ul>
    <div class="resource-links">
      <a
        v-for="(m, i) in [...(nodeDetail.media || []), ...(nodeDetail.demo_media || [])]"
        :key="i"
        :href="safeUrl(m.url) || undefined"
        target="_blank"
        rel="noopener noreferrer"
        >{{ m.title || m.type }} ↗</a
      >
    </div>
    <button
      v-if="nodeDetail.kind === 'plan'"
      class="btn primary full"
      @click="
        () => {
          addPlan(nodeDetail)
          nodeDetail = null
        }
      "
    >
      拼入我的方案
    </button></Modal
  >
  <Modal v-if="publish" title="发布你的训练作品" @close="publish = false"
    ><form class="form-stack" @submit.prevent="publishListing">
      <div class="two-col">
        <label
          >作品类型<select v-model="publishing.kind">
            <option value="plan">训练方案</option>
            <option value="lesson">动作教学</option>
          </select></label
        ><label
          >适配水平<select v-model="publishing.level">
            <option>入门</option>
            <option>进阶</option>
          </select></label
        >
      </div>
      <label>作品名称<input v-model="publishing.title" required maxlength="128" /></label>
      <div class="two-col">
        <label
          >价格（元）<input
            v-model.number="publishing.price"
            type="number"
            min="0.01"
            max="99999"
            step="0.01"
            required /></label
        ><label>适配体重<input v-model="publishing.body_range" required /></label>
      </div>
      <label>作品介绍<textarea v-model="publishing.body_text" rows="3"></textarea></label
      ><template v-if="publishing.kind === 'plan'"
        ><label
          >计划周期<select v-model="publishing.cycle">
            <option value="week">周</option>
            <option value="month">月</option>
            <option value="full">全程</option>
          </select></label
        >
        <div class="info-box">
          将发布你当前推 / 拉 / 腿的早晚训练计划，优先使用已记录的实际重量、组数与次数，共
          {{ currentDays().length }} 个训练时段。请先在「每周计划」确认内容。
        </div></template
      ><template v-else
        ><label>教学主题<input v-model="publishing.topic" required /></label
        ><label
          >教学步骤（每行一条）<textarea
            v-model="publishing.steps"
            rows="3"
            required
          ></textarea></label
        ><label>关键提示（每行一条）<textarea v-model="publishing.cues" rows="2"></textarea></label
        ><label>技能标签（逗号分隔）<input v-model="publishing.skill_tags" /></label
      ></template>
      <div class="two-col">
        <label
          >媒体类型<select v-model="publishing.mediaType">
            <option value="video">视频</option>
            <option value="image">图片</option>
            <option value="audio">音频</option>
          </select></label
        ><label
          >媒体链接{{ publishing.kind === 'lesson' ? '（必填）' : '（选填）'
          }}<input
            v-model="publishing.mediaUrl"
            type="url"
            :required="publishing.kind === 'lesson'"
            placeholder="https://…"
        /></label>
      </div>
      <button class="btn primary full" type="submit" :disabled="pending">
        {{ pending ? '正在发布…' : '确认上架作品' }}
      </button>
    </form></Modal
  >
</template>
