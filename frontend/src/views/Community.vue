<script setup>
import PublicProfile from '../components/PublicProfile.vue'
import { ref, watch, onBeforeUnmount } from 'vue'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import ReportForm from '../components/ReportForm.vue'
import ModerationConsole from '../components/ModerationConsole.vue'
import Notifications from '../components/Notifications.vue'
import RankSettings from '../components/RankSettings.vue'
import { api } from '../api'
import { notify } from '../store'
const tab = ref('feed'),
  period = ref('week'),
  dim = ref('strength'),
  loading = ref(false),
  error = ref(''),
  ranking = ref(null),
  feed = ref([]),
  people = ref([]),
  comments = ref({}),
  pending = ref(false)
const pendingPath = ref('')
const peopleQuery = ref(''),
  feedScope = ref('following')
const rankScope = ref('public')
const postText = ref(''),
  reportTarget = ref(null),
  deletePost = ref(null)
async function publishPost() {
  if (await mutate('/home/posts', { text: postText.value })) postText.value = ''
}
async function confirmDelete() {
  if (pending.value) return
  pending.value = true
  try {
    await api('/home/feed/' + deletePost.value, undefined, 'DELETE')
    deletePost.value = null
    await load()
  } catch (e) {
    notify(e.message)
  } finally {
    pending.value = false
  }
}
const dims = [
  ['strength', '力量完成', '%'],
  ['overload', '渐进超负荷', '个'],
  ['protein', '蛋白达标', '天'],
  ['streak', '连续训练', '周'],
  ['weight_class', '同体重进步', 'kg'],
]
let controller
const nextCursor = ref(null),
  moreLoading = ref(false),
  moreError = ref('')
async function loadMore() {
  if (moreLoading.value || !nextCursor.value) return
  moreLoading.value = true
  moreError.value = ''
  const signal = controller?.signal
  try {
    const data = await api(
      '/home/feed?before=' + nextCursor.value + '&scope=' + feedScope.value,
      undefined,
      'GET',
      signal,
    )
    if (signal?.aborted) return
    const ids = new Set(feed.value.map((p) => p.post_id))
    feed.value.push(...data.items.filter((p) => !ids.has(p.post_id)))
    nextCursor.value = data.next_cursor
  } catch (e) {
    if (e.name !== 'AbortError') moreError.value = e.message
  } finally {
    moreLoading.value = false
  }
}
async function load() {
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  error.value = ''
  try {
    const [r, f, p] = await Promise.all([
      api(
        `/home/rank?period=${period.value}&dim=${dim.value}&scope=${rankScope.value}`,
        undefined,
        'GET',
        signal,
      ),
      api('/home/feed?scope=' + feedScope.value, undefined, 'GET', signal),
      api('/home/discover?q=' + encodeURIComponent(peopleQuery.value), undefined, 'GET', signal),
    ])
    ranking.value = r
    feed.value = f.items
    nextCursor.value = f.next_cursor
    people.value = p.items
  } catch (e) {
    if (e.name !== 'AbortError') error.value = e.message
  } finally {
    if (!signal.aborted) loading.value = false
  }
}
watch([period, dim], load, { immediate: true })
watch(feedScope, load)
watch(rankScope, load)
onBeforeUnmount(() => controller?.abort())
async function mutate(path, body = {}) {
  if (pending.value) return
  pending.value = true
  pendingPath.value = path
  try {
    await api(path, body)
    await load()
    return true
  } catch (e) {
    notify(e.message)
  } finally {
    pending.value = false
    pendingPath.value = ''
  }
}
async function comment(post) {
  const text = comments.value[post.post_id]?.trim()
  if (!text) return
  if (await mutate(`/home/feed/${post.post_id}/comments`, { text }))
    comments.value[post.post_id] = ''
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">GROW STRONGER TOGETHER</div>
      <h1>有人同行，更有力量<span class="green-dot">.</span></h1>
      <p>为真实的进步喝彩，找到一起坚持的训练伙伴。</p>
    </div>
    <button class="btn" :disabled="loading" @click="load">
      <Icon name="refresh" :size="17" />刷新动态
    </button>
  </div>
  <div class="tabs">
    <button
      v-for="[id, label] in [
        ['feed', '关注动态'],
        ['rank', '训练排行榜'],
        ['people', '发现伙伴'],
        ['profile', '我的公开资料'],
        ['notifications', '消息通知'],
      ]"
      :key="id"
      :class="{ active: tab === id }"
      @click="tab = id"
    >
      {{ label }}
    </button>
  </div>
  <ModerationConsole />
  <PublicProfile v-if="tab === 'profile'" @saved="load" />
  <Notifications v-if="tab === 'notifications'" />
  <label v-if="tab === 'feed'"
    >动态范围<select v-model="feedScope">
      <option value="following">关注与本人</option>
      <option value="all">全部公开动态</option>
    </select></label
  >
  <form v-if="tab === 'people'" class="row wrap" @submit.prevent="load">
    <label>搜索公开昵称<input v-model="peopleQuery" type="search" maxlength="64" /></label
    ><button class="btn">搜索伙伴</button>
  </form>
  <div v-if="error" class="alert">
    连接失败：{{ error }} <button class="text-link" @click="load">重试</button>
  </div>
  <p v-if="loading" class="loading-state">正在同步训练社区…</p>
  <template v-if="!error"
    ><div v-if="tab === 'feed'" class="community-layout">
      <section>
        <form class="panel form-stack" @submit.prevent="publishPost">
          <label
            >分享训练动态<textarea
              v-model="postText"
              required
              maxlength="2000"
              placeholder="记录今天的训练成果或心得"
            /></label
          ><button class="btn primary" :disabled="pending || !postText.trim()">发布动态</button>
          <p class="tiny">当前支持文字动态，每日最多20条；请勿发布他人隐私或违规内容。</p>
        </form>
        <div v-if="!feed.length && !loading" class="panel empty-state">
          <Icon name="community" :size="42" />
          <h3>关注伙伴，看见更多坚持</h3>
          <p>关注后，这里会显示他们的训练成果。</p>
          <button class="btn primary" @click="tab = 'people'">发现训练伙伴</button>
        </div>
        <article v-for="post in feed" :key="post.post_id" class="panel feed-card">
          <div class="row">
            <span class="avatar">{{ post.user?.slice(0, 1) }}</span>
            <div>
              <h3>{{ post.user }}</h3>
              <p>分享了本周训练成果</p>
            </div>
            <span class="pill green push-right">本周进步</span>
          </div>
          <div class="gain-list">
            <span v-for="(gain, i) in post.gains" :key="i"
              ><Icon name="trend" :size="18" />{{
                typeof gain === 'string' ? gain : gain.text || gain.label || JSON.stringify(gain)
              }}</span
            >
          </div>
          <div class="feed-actions">
            <button class="text-link" @click="reportTarget = { kind: 'post', id: post.post_id }">
              举报动态
            </button>
            <button v-if="post.can_delete" class="text-link" @click="deletePost = post.post_id">
              删除本人动态
            </button>
            <button
              class="text-link"
              :class="{ liked: post.liked_by_me }"
              :disabled="pending"
              @click="mutate(`/home/feed/${post.post_id}/like`)"
            >
              <Icon name="heart" :size="18" />{{ post.liked_by_me ? '已赞' : '点赞' }} ·
              {{ post.likes }}</button
            ><span class="muted row"
              ><Icon name="comment" :size="17" />{{ post.comments.length }} 条留言</span
            >
          </div>
          <div v-for="c in post.comments" :key="c.id" class="comment-row">
            <strong>{{ c.user }}</strong
            ><span>{{ c.text }}</span>
            <button class="text-link" @click="reportTarget = { kind: 'feed_comment', id: c.id }">
              举报留言
            </button>
          </div>
          <form class="row comment-form" @submit.prevent="comment(post)">
            <input
              v-model="comments[post.post_id]"
              aria-label="动态留言"
              placeholder="给训练伙伴一点鼓励…"
              maxlength="500"
              required
            /><button class="btn small-btn" :disabled="pending" type="submit">发送</button>
          </form>
        </article>
        <p v-if="moreError" class="alert">{{ moreError }}</p>
        <button
          v-if="nextCursor"
          class="btn full"
          :disabled="moreLoading || loading || pending"
          @click="loadMore"
        >
          {{ moreLoading ? '正在加载…' : moreError ? '重试加载更多' : '加载更多动态' }}
        </button>
      </section>
      <aside class="panel community-aside">
        <div class="section-heading">
          <h2>本周领跑者</h2>
          <Icon name="trophy" />
        </div>
        <div v-for="(u, i) in ranking?.top3 || []" :key="u.user_id" class="leader-row">
          <span class="rank-number">{{ i + 1 }}</span
          ><span class="avatar">{{ u.name?.slice(0, 1) }}</span>
          <div>
            <strong>{{ u.name }}</strong>
            <p>{{ u.score }}{{ dims.find((d) => d[0] === dim)?.[2] }} 力量完成</p>
          </div>
        </div>
        <button class="btn full" @click="tab = 'rank'">
          查看完整榜单<Icon name="arrow" :size="15" />
        </button>
      </aside>
    </div>
    <section v-if="tab === 'rank'" class="panel">
      <RankSettings @updated="load" />
      <label
        >榜单范围<select v-model="rankScope">
          <option value="public">公开榜</option>
          <option value="friends">好友榜（互相关注）</option>
        </select></label
      >
      <div class="section-heading">
        <div>
          <h2>每一种坚持，都值得被看见</h2>
          <p>榜单每小时保留快照 · {{ ranking?.compare_hint }}</p>
        </div>
        <div class="segmented">
          <button :class="{ active: period === 'week' }" @click="period = 'week'">本周</button
          ><button :class="{ active: period === 'month' }" @click="period = 'month'">本月</button>
        </div>
      </div>
      <div class="filter-chips">
        <button
          v-for="[id, label] in dims"
          :key="id"
          class="chip"
          :class="{ active: dim === id }"
          @click="dim = id"
        >
          {{ label }}
        </button>
      </div>
      <details class="info-box">
        <summary>榜单计算规则</summary>
        <p>统计周期：{{ ranking?.period_rule }}</p>
        <p v-for="[id, label] in dims" :key="id">{{ label }}：{{ ranking?.rules?.[id] }}</p>
        <p>{{ ranking?.tie_rule }}</p>
        <p>计算时间：{{ ranking?.calculated_at }}；比较快照（UTC）：{{ ranking?.snapshot_hour }}</p>
      </details>
      <div v-if="ranking?.me" class="info-box row between">
        <span>我的位置 · {{ ranking.me.rank_label }}</span
        ><strong>{{ ranking.me.score }}{{ dims.find((d) => d[0] === dim)?.[2] }}</strong>
      </div>
      <div class="ranking-table">
        <div
          v-for="u in ranking?.full || []"
          :key="u.user_id"
          class="ranking-row"
          :class="{ me: u.is_me }"
        >
          <span class="rank-number">{{ String(u.rank).padStart(2, '0') }}</span
          ><span class="avatar">{{ u.name?.slice(0, 1) }}</span>
          <div class="rank-user">
            <strong>{{ u.name }} {{ u.is_me ? '（我）' : '' }}</strong>
            <p>{{ u.body_band }} · {{ u.rank_label }}</p>
          </div>
          <strong
            >{{ u.score }}<small>{{ dims.find((d) => d[0] === dim)?.[2] }}</small></strong
          ><span class="rank-delta">{{
            u.delta > 0 ? '↑ ' + u.delta : u.delta < 0 ? '↓ ' + Math.abs(u.delta) : '—'
          }}</span>
        </div>
      </div>
    </section>
    <section v-if="tab === 'people'" class="people-grid">
      <article v-for="u in people" :key="u.user_id" class="panel person-card">
        <img
          v-if="u.avatar_url"
          class="avatar large"
          :src="u.avatar_url"
          alt="公开头像"
          referrerpolicy="no-referrer"
        /><span v-else class="avatar large">{{ u.name?.slice(0, 1) }}</span>
        <h3>{{ u.name }}</h3>
        <p v-if="u.bio">{{ u.bio }}</p>
        <p>{{ u.body_band }} · 训练伙伴</p>
        <button
          class="btn full"
          :class="{ primary: !u.following }"
          :disabled="pending"
          :aria-busy="pendingPath === `/home/follows/${u.user_id}`"
          @click="mutate(`/home/follows/${u.user_id}`)"
        >
          <Icon :name="u.following ? 'check' : 'plus'" :size="16" />{{
            pendingPath === `/home/follows/${u.user_id}`
              ? '正在更新…'
              : u.following
                ? '已关注 · 取消'
                : '关注伙伴'
          }}
        </button>
      </article>
    </section></template
  >
  <Modal v-if="reportTarget" title="举报内容" @close="reportTarget = null"
    ><ReportForm
      :kind="reportTarget.kind"
      :target-id="reportTarget.id"
      @close="reportTarget = null"
  /></Modal>
  <Modal v-if="deletePost" title="删除本人动态" @close="deletePost = null"
    ><p>动态及其留言、点赞将删除，不能恢复。</p>
    <button class="btn" @click="deletePost = null">取消删除动态</button
    ><button class="btn destructive" :disabled="pending" @click="confirmDelete">
      确认删除动态
    </button></Modal
  >
</template>
