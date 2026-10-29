<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
const props = defineProps({ creator: Number }),
  emit = defineEmits(['open'])
const favorites = ref([]),
  recommended = ref([]),
  profile = ref(null),
  rule = ref(''),
  error = ref(''),
  loading = ref(false)
async function load() {
  loading.value = true
  error.value = ''
  try {
    if (props.creator) profile.value = await api('/market/creators/' + props.creator)
    else {
      const [f, r] = await Promise.all([api('/market/favorites'), api('/market/recommendations')])
      favorites.value = f.items
      recommended.value = r.items
      rule.value = r.rule
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
<template>
  <section class="panel" aria-label="作品收藏与推荐">
    <p v-if="loading">正在加载作品…</p>
    <p v-if="error" class="alert">
      {{ error }}<button class="btn" @click="load">重试收藏推荐</button>
    </p>
    <template v-if="profile"
      ><h2>{{ profile.name }}的公开作品</h2>
      <p v-if="!profile.items.length">暂无公开作品。</p>
      <article v-for="w in profile.items" :key="w.listing_id">
        <h3>{{ w.title }}</h3>
        <p>{{ w.body_text }}</p>
        <button class="btn" @click="emit('open', w)">查看创作者作品</button>
      </article></template
    >
    <template v-else
      ><h2>我的作品收藏</h2>
      <p v-if="!favorites.length && !loading">还没有收藏公开作品。</p>
      <article v-for="w in favorites" :key="w.listing_id">
        <h3>{{ w.title }}</h3>
        <p>{{ w.user }} · ¥{{ (w.price_fen / 100).toFixed(2) }}</p>
        <button class="btn" @click="emit('open', w)">查看收藏作品</button>
      </article>
      <h2>为你推荐</h2>
      <p>{{ rule }}</p>
      <p v-if="!recommended.length && !loading">暂无匹配等级的公开作品。</p>
      <article v-for="w in recommended" :key="w.listing_id">
        <h3>{{ w.title }}</h3>
        <p>{{ w.user }} · {{ w.level }}</p>
        <button class="btn" @click="emit('open', w)">查看推荐作品</button>
      </article></template
    >
  </section>
</template>
