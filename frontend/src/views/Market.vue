<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import MarketCollections from '../components/MarketCollections.vue'
import ReportForm from '../components/ReportForm.vue'
import Orders from '../components/Orders.vue'
import { api, demoMode } from '../api'
import { state, week, getPlan, notify, sessionKey, recalculateDay, uid } from '../store'
const tab = ref('browse'),
  query = ref(''),
  sort = ref('newest'),
  kind = ref('all'),
  cycle = ref('all'),
  level = ref('all'),
  listings = ref([]),
  listingCursor = ref(null),
  moreListings = ref(false),
  mine = ref([]),
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
const assemblyConfirm = ref(false)
const assemblies = ref([]),
  assemblyCursor = ref(null),
  restoredFrom = ref(null),
  dragging = ref(null)
async function loadAssemblies(more = false) {
  await action(async () => {
    const data = await api(
      '/market/assemblies' +
        (more && assemblyCursor.value ? '?before=' + assemblyCursor.value : ''),
    )
    assemblies.value = more ? [...assemblies.value, ...data.items] : data.items
    assemblyCursor.value = data.next_cursor
  })
}
function restoreAssembly(plan) {
  draft.value = {
    title: plan.title,
    cycle: plan.cycle,
    days: JSON.parse(JSON.stringify(plan.days)),
  }
  restoredFrom.value = plan.plan_id
  assembleWeight.value = false
  assembleLevel.value = false
  notify('历史版本已载入预览；再次确认后才会替换本周计划并生成新版本')
}
function moveExercise(di, from, to) {
  const list = draft.value.days[di].exercises
  if (to < 0 || to >= list.length || from === to) return
  list.splice(to, 0, list.splice(from, 1)[0])
  assembleWeight.value = false
  assembleLevel.value = false
}
function startExerciseDrag(event, di, ei) {
  if (event.button !== 0) return
  event.preventDefault()
  dragging.value = { di, ei }
  event.currentTarget.setPointerCapture(event.pointerId)
}
function finishExerciseDrag(event) {
  const target = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest('[data-exercise-index]')
  if (target && dragging.value && Number(target.dataset.dayIndex) === dragging.value.di)
    moveExercise(dragging.value.di, dragging.value.ei, Number(target.dataset.exerciseIndex))
  dragging.value = null
}
const creatorProfile = ref(null)
const reportTarget = ref(null)
const replyTexts = ref({}),
  replyDelete = ref(null)
async function sendReply(c) {
  if (!replyTexts.value[c.id]?.trim()) return
  await action(async () => {
    await api(`/market/comments/${c.id}/replies`, { text: replyTexts.value[c.id] })
    replyTexts.value[c.id] = ''
    detail.value = await api('/market/listings/' + detail.value.listing_id)
  })
}
async function deleteReply() {
  await action(async () => {
    await api('/market/replies/' + replyDelete.value, undefined, 'DELETE')
    replyDelete.value = null
    detail.value = await api('/market/listings/' + detail.value.listing_id)
  })
}
const commentDelete = ref(null)
async function deleteComment() {
  await action(async () => {
    await api('/market/comments/' + commentDelete.value, undefined, 'DELETE')
    commentDelete.value = null
    detail.value = await api('/market/listings/' + detail.value.listing_id)
  })
}
async function reviewComment(c) {
  await action(async () => {
    await api(`/moderation/market_comment/${c.id}/review`, { hidden: !c.hidden })
    detail.value = await api('/market/listings/' + detail.value.listing_id)
  })
}
async function collectionOpen(work) {
  creatorProfile.value = null
  await open(work)
}
const describeExercise = (e) =>
  `${e.name} · ${e.sets}×${e.reps}${e.load ? ' · ' + e.load : ''}${e.lesson_node_id ? ' · 教学节点#' + e.lesson_node_id : ''}${e.notes || e.note ? ' · ' + (e.notes || e.note) : ''}`
const replacements = computed(() =>
  draft.value.days.flatMap((d) =>
    (d.day_type === 'rest' ? [2, 4, 6, 7] : [{ push: 1, pull: 3, legs: 5 }[d.day_type]]).map(
      (day) => ({
        day,
        session: d.session,
        old: ['am', 'pm']
          .filter((s) => d.session === 'both' || s === d.session)
          .flatMap((s) => getPlan(day)[s].map(describeExercise))
          .join('、'),
        next: d.exercises.map(describeExercise).join('、'),
      }),
    ),
  ),
)
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
const workDrafts = ref([]),
  draftId = ref(null),
  editingWork = ref(null),
  frozenContent = ref(null),
  versionHistory = ref(null)
function newWork() {
  draftId.value = null
  editingWork.value = null
  frozenContent.value = null
  publish.value = true
}
async function saveWorkDraft() {
  await action(async () => {
    draftId.value ||= uid()
    await api(
      '/market/drafts/' + draftId.value,
      {
        data: {
          form: publishing.value,
          content: frozenContent.value || { days: currentDays() },
          editing: editingWork.value,
        },
      },
      'PUT',
    )
    await load()
    notify('草稿已保存，尚未发布')
  })
}
function resumeWorkDraft(d) {
  publishing.value = { ...d.data.form }
  frozenContent.value = d.data.content
  editingWork.value = d.data.editing
  draftId.value = d.draft_id
  publish.value = true
}
async function removeWorkDraft(id) {
  await action(async () => {
    await api('/market/drafts/' + id, undefined, 'DELETE')
    await load()
  })
}
function editWork(work) {
  publishing.value = {
    ...publishing.value,
    kind: work.kind,
    title: work.title,
    level: work.level,
    price: work.price_fen / 100,
    body_range: work.body_range,
    body_text: work.body_text,
    cycle: work.cycle || 'week',
    topic: work.topic || '',
    steps: (work.steps || []).join('\n'),
    cues: (work.cues || []).join('\n'),
    skill_tags: (work.skill_tags || []).join(','),
    mediaUrl: work.media?.[0]?.url || '',
    mediaType: work.media?.[0]?.type || 'video',
  }
  editingWork.value = { id: work.listing_id, version: work.version }
  frozenContent.value = JSON.parse(JSON.stringify(work))
  draftId.value = null
  publish.value = true
}
async function changeWorkStatus(work) {
  await action(async () => {
    await api(`/market/listings/${work.listing_id}/status`, {
      status: work.status === 'listed' ? 'unlisted' : 'listed',
    })
    await load()
    notify('作品状态已更新；已有复刻节点保留原内容')
  })
}
async function viewVersions(work) {
  await action(async () => {
    versionHistory.value = await api(`/market/listings/${work.listing_id}/versions`)
  })
}
const dayNames = { push: '推日', pull: '拉日', legs: '腿日', rest: '恢复日' }
const nodeQuery = ref(''),
  nodeCategory = ref(''),
  favoriteOnly = ref(false)
async function saveNodePreference(n, favorite = n.favorite) {
  await action(async () => {
    await api(`/market/nodes/${n.node_id}/preferences`, { favorite, category: n.category || '' })
    await load()
    notify('节点整理已保存')
  })
}
const libraryNodes = ref([]),
  nodeCursor = ref(null),
  libraryBusy = ref(false)
const visibleNodes = computed(() => libraryNodes.value)
let nodeController
async function loadNodeLibrary(more = false) {
  if (more && !nodeCursor.value) return
  nodeController?.abort()
  nodeController = new AbortController()
  const signal = nodeController.signal
  libraryBusy.value = true
  try {
    const params = new URLSearchParams({
      q: nodeQuery.value,
      kind: nodeFilter.value,
      category: nodeCategory.value,
      favorite_only: String(favoriteOnly.value),
    })
    if (more) params.set('before', nodeCursor.value)
    const result = await api('/market/node-library?' + params, undefined, 'GET', signal)
    if (signal.aborted) return
    libraryNodes.value = more ? [...libraryNodes.value, ...result.items] : result.items
    nodeCursor.value = result.next_cursor
  } catch (e) {
    if (e.name !== 'AbortError') notify('节点加载失败：' + e.message)
  } finally {
    if (!signal.aborted) libraryBusy.value = false
  }
}
watch([nodeQuery, nodeFilter, nodeCategory, favoriteOnly], () => loadNodeLibrary(), {
  immediate: true,
})
onBeforeUnmount(() => nodeController?.abort())

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
    const [l, n, own, drafts] = await Promise.all([
      api(
        `/market/listings?${new URLSearchParams({ kind: kind.value, cycle: cycle.value, level: level.value, q: query.value, sort: sort.value })}`,
        undefined,
        'GET',
        signal,
      ),
      api('/market/nodes', undefined, 'GET', signal),
      api('/market/mine', undefined, 'GET', signal),
      api('/market/drafts', undefined, 'GET', signal),
    ])
    listings.value = l.items
    listingCursor.value = l.next_cursor
    nodes.value = n.items
    mine.value = own.items
    workDrafts.value = drafts.items
    await loadNodeLibrary()
  } catch (e) {
    if (e.name !== 'AbortError') error.value = e.message
  } finally {
    if (!signal.aborted) loading.value = false
  }
}
async function loadMoreListings() {
  if (!listingCursor.value || moreListings.value) return
  const signal = controller?.signal
  moreListings.value = true
  try {
    const result = await api(
      `/market/listings?${new URLSearchParams({ kind: kind.value, cycle: cycle.value, level: level.value, q: query.value, sort: sort.value, cursor: listingCursor.value })}`,
      undefined,
      'GET',
      signal,
    )
    if (signal?.aborted) return
    const known = new Set(listings.value.map((w) => w.listing_id))
    listings.value.push(...result.items.filter((w) => !known.has(w.listing_id)))
    listingCursor.value = result.next_cursor
  } catch (e) {
    if (e.name !== 'AbortError') notify('加载更多失败：' + e.message)
  } finally {
    moreListings.value = false
  }
}
watch([kind, cycle, level, sort], load, { immediate: true })
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
  assemblyConfirm.value = true
}
async function applyAssembly() {
  if (!assembleWeight.value || !assembleLevel.value) return
  await action(async () => {
    const data = await api('/market/assemble', {
      ...draft.value,
      restored_from_id: restoredFrom.value,
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
        recalculateDay(weekday)
      }
    }
    assembleWeight.value = false
    assembleLevel.value = false
    notify(data.message || '已应用到本周训练')
    assemblyConfirm.value = false
    restoredFrom.value = null
    const versions = await api('/market/assemblies')
    assemblies.value = versions.items
    assemblyCursor.value = versions.next_cursor
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
        days: frozenContent.value?.days || currentDays(),
        rhythm: frozenContent.value?.rhythm || '周一推 / 周三拉 / 周五腿，其余恢复',
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
    if (frozenContent.value) {
      body.cover_url = frozenContent.value.cover_url || ''
      body.week_index = frozenContent.value.week_index || null
      body.media = [...media, ...(frozenContent.value.media || []).slice(1)]
      if (p.kind === 'lesson')
        body.demo_media = [...media, ...(frozenContent.value.demo_media || []).slice(1)]
    }
    if (editingWork.value)
      await api(
        `/market/listings/${editingWork.value.id}/content`,
        { expected_version: editingWork.value.version, content: body },
        'PUT',
      )
    else await api('/market/listings', body)
    if (draftId.value) await api('/market/drafts/' + draftId.value, undefined, 'DELETE')
    publish.value = false
    await load()
    notify(editingWork.value ? '作品新版本已保存，原有复刻不变' : '作品已上架')
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
    <button class="btn primary" @click="newWork"><Icon name="plus" :size="17" />发布作品</button>
  </div>
  <div v-if="['return', 'cancel'].includes(route.query.payment)" class="info-box" role="status">
    {{
      route.query.payment === 'cancel' ? '已从支付取消页返回。' : '已从支付页返回。'
    }}支付结果以服务端订单记录为准，未确认前不会授予复刻权限。<button
      class="btn"
      @click="tab = 'orders'"
    >
      查询支付订单
    </button>
  </div>
  <div class="tabs">
    <button
      v-for="[id, label] in [
        ['browse', '发现好方案'],
        ['nodes', '我的训练节点'],
        ['compose', '拼装训练方案'],
        ['mine', '我发布的作品'],
        ['collections', '收藏与推荐'],
        ['orders', '订单与交易台账'],
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
  <Orders v-if="tab === 'orders'" />
  <MarketCollections v-if="tab === 'collections'" @open="collectionOpen" />
  <section v-if="tab === 'mine'" class="panel">
    <h2>我发布的作品</h2>
    <h3>私有草稿</h3>
    <p v-if="!workDrafts.length">暂无草稿。</p>
    <article v-for="d in workDrafts" :key="d.draft_id" class="history-row">
      <span>{{ d.data.form?.title || '未命名草稿' }}</span>
      <button class="btn" @click="resumeWorkDraft(d)">继续编辑草稿</button>
      <button class="btn" @click="removeWorkDraft(d.draft_id)">删除草稿</button>
    </article>
    <p v-if="!mine.length">还未发布作品。</p>
    <article v-for="work in mine" :key="work.listing_id" class="history-row">
      <div>
        <strong>{{ work.title }}</strong>
        <p>
          {{ work.status === 'listed' ? '已发布' : '已下架' }} · {{ work.created_at }} · ¥{{
            yuan(work.price_fen)
          }}
        </p>
      </div>
      <div class="row wrap">
        <span>版本 {{ work.version }}</span>
        <button class="btn" @click="open(work)">查看作品</button>
        <button class="btn" @click="editWork(work)">编辑作品</button>
        <button class="btn" @click="changeWorkStatus(work)">
          {{ work.status === 'listed' ? '下架作品' : '重新上架' }}
        </button>
        <button class="btn" @click="viewVersions(work)">作品版本历史</button>
      </div>
    </article>
  </section>
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
    <form class="row wrap" @submit.prevent="load">
      <label
        >搜索作品<input
          v-model="query"
          type="search"
          maxlength="128"
          placeholder="标题、简介或创作者" /></label
      ><button class="btn" type="submit">搜索</button
      ><label
        >作品排序<select v-model="sort">
          <option value="newest">最新发布</option>
          <option value="price_asc">价格从低到高</option>
          <option value="price_desc">价格从高到低</option>
          <option value="popular">最多点赞</option>
        </select></label
      >
    </form>
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
    <div class="row wrap">
      <label>搜索节点<input v-model="nodeQuery" type="search" /></label
      ><label
        >筛选分类<input v-model="nodeCategory" placeholder="留空显示全部" maxlength="32" /></label
      ><label><input v-model="favoriteOnly" type="checkbox" />仅收藏节点</label>
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
        <p class="tiny">
          来源作品 #{{ n.source_listing_id }} · 来源版本 {{ n.source_version || '旧数据未记录' }} ·
          复刻于 {{ n.purchased_at }}
        </p>
        <label>节点分类<input v-model="n.category" maxlength="32" /></label>
        <button class="btn small-btn" :disabled="pending" @click="saveNodePreference(n)">
          保存分类
        </button>
        <button
          class="btn small-btn"
          :disabled="pending"
          @click="saveNodePreference(n, !n.favorite)"
        >
          {{ n.favorite ? '取消节点收藏' : '收藏节点' }}
        </button>
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
          <div
            v-for="(ex, ei) in d.exercises"
            :key="ei"
            class="compose-exercise"
            :data-day-index="di"
            :data-exercise-index="ei"
          >
            <span
              class="drag-handle"
              style="display: block; cursor: grab; touch-action: none; user-select: none"
              @pointerdown="startExerciseDrag($event, di, ei)"
              @pointerup="finishExerciseDrag"
              @pointercancel="dragging = null"
              aria-hidden="true"
              >↕ 拖动排序</span
            >
            <strong>{{ ex.name }}</strong>
            <div class="row wrap">
              <button
                class="btn small-btn"
                :aria-label="'上移动作' + ex.name"
                :disabled="ei === 0"
                @click="moveExercise(di, ei, ei - 1)"
              >
                上移</button
              ><button
                class="btn small-btn"
                :aria-label="'下移动作' + ex.name"
                :disabled="ei === d.exercises.length - 1"
                @click="moveExercise(di, ei, ei + 1)"
              >
                下移
              </button>
            </div>
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
        <p v-if="restoredFrom">正在预览历史方案 #{{ restoredFrom }}，应用将创建新版本。</p>
        <button class="btn" @click="loadAssemblies()">加载方案版本</button>
        <article v-for="v in assemblies" :key="v.plan_id" class="history-row">
          <div>
            <strong>#{{ v.plan_id }} {{ v.title }}</strong>
            <p>{{ v.active ? '当前版本' : '历史版本' }} · {{ v.created_at }}</p>
            <p v-if="v.restored_from_id">恢复来源 #{{ v.restored_from_id }}</p>
            <p v-for="(d, i) in v.days" :key="i">
              {{ dayNames[d.day_type] }} {{ d.session }}：{{
                d.exercises.map((e) => e.name).join('、')
              }}
            </p>
          </div>
          <button class="btn" @click="restoreAssembly(v)">预览并恢复此版本</button>
        </article>
        <button v-if="assemblyCursor" class="btn" @click="loadAssemblies(true)">
          更多方案版本
        </button>
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
      <button
        class="btn"
        :disabled="pending"
        @click="
          action(async () => {
            await api(`/market/listings/${detail.listing_id}/favorite`, {
              favorite: !detail.favorite,
            })
            detail.favorite = !detail.favorite
          })
        "
      >
        {{ detail.favorite ? '取消作品收藏' : '收藏作品' }}
      </button>
      <button class="btn" @click="creatorProfile = detail.seller_id">创作者主页</button>
      <button class="text-link" @click="reportTarget = { kind: 'market', id: detail.listing_id }">
        举报作品
      </button>
      <p v-if="!detail.comments.length" class="muted">还没有留言，分享你的想法吧。</p>
      <div v-for="c in detail.comments" :key="c.id" class="comment-row">
        <strong>{{ c.user }}</strong
        ><span>{{ c.text }}</span>
        <small v-if="c.hidden">已隐藏，仅管理者可见</small>
        <button class="text-link" @click="reportTarget = { kind: 'market_comment', id: c.id }">
          举报商品留言
        </button>
        <button v-if="c.can_manage" class="text-link" :disabled="pending" @click="reviewComment(c)">
          {{ c.hidden ? '恢复商品留言' : '隐藏商品留言' }}
        </button>
        <button v-if="c.can_delete" class="text-link" @click="commentDelete = c.id">
          删除商品留言
        </button>
        <div class="reply-list">
          <div v-for="r in c.replies || []" :key="r.id">
            <p>{{ r.user }}：{{ r.text }} <small v-if="r.hidden">已隐藏</small></p>
            <button class="text-link" @click="reportTarget = { kind: 'market_reply', id: r.id }">
              举报回复</button
            ><button v-if="r.can_delete" class="text-link" @click="replyDelete = r.id">
              删除回复
            </button>
          </div>
          <form v-if="!c.hidden" class="row wrap" @submit.prevent="sendReply(c)">
            <input
              v-model="replyTexts[c.id]"
              aria-label="商品留言回复"
              maxlength="500"
              required
              placeholder="回复这条留言"
            /><button class="btn small-btn" :disabled="pending">回复留言</button>
          </form>
        </div>
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
        <p>
          来源作品 #{{ detail.listing_id }} ·
          {{
            detail.user
          }}；复刻包含该作品的节点结构与已列出的媒体链接。未提供的媒体不属于复刻范围，图片/视频链接仍可能失效。
        </p>
        <p>
          使用限制：请核对创作者作品说明；当前系统没有单独的授权条款字段，不将购买视为版权转让。
        </p>
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
  <Modal v-if="commentDelete" title="确认删除商品留言" @close="commentDelete = null"
    ><p>将删除此留言及其回复，无法撤销。</p>
    <button class="btn" @click="commentDelete = null">取消删除留言</button
    ><button class="btn" :disabled="pending" @click="deleteComment">确认删除商品留言</button></Modal
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
          >作品类型<select v-model="publishing.kind" :disabled="!!editingWork">
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
          {{ frozenContent ? '保留草稿或原作品中的计划动作，共' : '将发布当前推/拉/腿计划，共' }}
          {{ (frozenContent?.days || currentDays()).length }}
          个训练时段。请先在「每周计划」确认内容。
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
      <button class="btn" type="button" :disabled="pending" @click="saveWorkDraft">
        保存作品草稿
      </button>
      <p v-if="editingWork" class="tiny">
        正在编辑版本
        {{ editingWork.version }}；保存生成新版本，并保持当前上架状态。已有复刻保留原内容。
      </p>
      <details class="info-box">
        <summary>发布前预览</summary>
        <h3>{{ publishing.title || '未填写名称' }}</h3>
        <p>{{ publishing.body_text }}</p>
        <p>
          适配 {{ publishing.level }} · {{ publishing.body_range }} · ¥{{ publishing.price }} ·
          {{ publishing.kind === 'plan' ? publishing.cycle : '教学' }}
        </p>
        <template v-if="publishing.kind === 'plan'"
          ><div v-for="(d, i) in frozenContent?.days || currentDays()" :key="i">
            <strong>{{ d.day_type }} · {{ d.session }}</strong>
            <p v-for="(ex, j) in d.exercises" :key="j">
              {{ ex.name }} · {{ ex.load }} · {{ ex.sets }} × {{ ex.reps }}
            </p>
          </div></template
        ><template v-else
          ><p>{{ publishing.topic }}</p>
          <p style="white-space: pre-line">{{ publishing.steps }}</p>
          <p>{{ publishing.cues }}</p></template
        >
        <p>媒体：{{ publishing.mediaUrl || '无媒体' }}</p>
      </details>
      <button class="btn primary full" type="submit" :disabled="pending">
        {{ pending ? '正在发布…' : '确认上架作品' }}
      </button>
    </form></Modal
  >
  <Modal v-if="versionHistory" title="作品版本历史" @close="versionHistory = null">
    <article v-for="v in versionHistory.items" :key="v.version">
      <h3>版本 {{ v.version }} · {{ v.content.title }}</h3>
      <p>{{ v.created_at }}</p>
      <p>{{ v.content.body_text }}</p>
      <p>¥{{ yuan(v.content.price_fen) }}</p>
    </article>
  </Modal>
  <Modal v-if="assemblyConfirm" title="确认替换本周计划" @close="assemblyConfirm = false"
    ><p>
      仅替换以下日期及时段，原始训练记录保留；同名动作已有完成勾选会保留。请核对重量和等级是否适合。
    </p>
    <div v-for="(r, i) in replacements" :key="i">
      <h3>周{{ r.day }} · {{ r.session }}</h3>
      <p>原计划：{{ r.old || '无动作' }}</p>
      <p>新计划：{{ r.next || '无动作' }}</p>
    </div>
    <div class="modal-actions">
      <button class="btn" @click="assemblyConfirm = false">取消替换</button
      ><button
        class="btn primary"
        :disabled="pending || !assembleWeight || !assembleLevel"
        @click="applyAssembly"
      >
        确认替换并应用
      </button>
    </div></Modal
  >
  <Modal v-if="creatorProfile" title="创作者公开主页" @close="creatorProfile = null"
    ><MarketCollections :creator="creatorProfile" @open="collectionOpen"
  /></Modal>
  <Modal v-if="reportTarget" title="举报市场内容" @close="reportTarget = null"
    ><ReportForm
      :kind="reportTarget.kind"
      :target-id="reportTarget.id"
      @close="reportTarget = null"
  /></Modal>
  <Modal v-if="replyDelete" title="删除回复" @close="replyDelete = null"
    ><p>删除后无法恢复。</p>
    <button class="btn" @click="replyDelete = null">取消删除回复</button
    ><button class="btn destructive" :disabled="pending" @click="deleteReply">
      确认删除回复
    </button></Modal
  >
</template>
