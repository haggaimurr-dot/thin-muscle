<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
const items = ref([]),
  unread = ref(0),
  cursor = ref(null),
  error = ref(''),
  busy = ref(false)
const labels = {
  follow: '关注了你',
  feed_like: '点赞了你的动态',
  feed_comment: '留言了你的动态',
  market_like: '点赞了你的作品',
  market_comment: '留言了你的作品',
  reply: '回复了留言',
}
async function load(more = false) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const data = await api(
      '/notifications' + (more && cursor.value ? '?before=' + cursor.value : ''),
    )
    items.value = more ? [...items.value, ...data.items] : data.items
    unread.value = data.unread
    cursor.value = data.next_cursor
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
onMounted(() => load())
async function mark(item) {
  busy.value = true
  error.value = ''
  try {
    await api(item ? `/notifications/${item.id}/read` : '/notifications/read-all', {})
    if (item) item.read = true
    else for (const m of items.value) m.read = true
    unread.value = Math.max(0, unread.value - (item ? 1 : unread.value))
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="panel" aria-label="站内消息通知">
    <h2>站内消息 · {{ unread }}条未读</h2>
    <p v-if="error" class="alert">{{ error }}</p>
    <div class="row wrap">
      <button class="btn" :disabled="busy" @click="load(false)">刷新消息</button
      ><button class="btn" :disabled="busy || !unread" @click="mark(null)">全部标为已读</button>
    </div>
    <p class="tiny">
      关注和点赞按用户与目标去重，不重复提醒；留言按记录去重。进入此页或手动刷新时更新，不会发送邮件或系统推送。
    </p>
    <p v-if="!items.length && !busy">暂无消息。</p>
    <article v-for="item in items" :key="item.id" class="row between wrap">
      <div>
        <p>
          {{ item.actor }} {{ labels[item.kind] || '与你互动' }} · {{ item.target_kind }}#{{
            item.target_id
          }}
        </p>
        <small>{{ new Date(item.created_at).toLocaleString('zh-CN') }}</small>
      </div>
      <button v-if="!item.read" class="btn" :disabled="busy" @click="mark(item)">标为已读</button
      ><span v-else>已读</span>
    </article>
    <button v-if="cursor" class="btn" :disabled="busy" @click="load(true)">加载更多消息</button>
  </section>
</template>
