<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Icon from '../components/Icon.vue'
import BadgeMark from '../components/BadgeMark.vue'
import Modal from '../components/Modal.vue'
import WeeklyGoals from '../components/WeeklyGoals.vue'
import { featuredBadge, wearBadge } from '../badgeProfile'
import { notify } from '../store'
import { api, demoMode } from '../api'
import { state } from '../store'
import { localBadges, nextBadge } from '../badges'
const wearing = ref(false)
async function wear() {
  if (wearing.value || !selected.value?.earned_at) return
  wearing.value = true
  const badge = selected.value
  try {
    const remove = featuredBadge.value?.id === badge.id
    await wearBadge(remove ? null : badge.id)
    notify(remove ? '已取消佩戴' : '已佩戴 ' + badge.title)
  } catch (e) {
    notify(e.message)
  } finally {
    wearing.value = false
  }
}
const remote = ref(null),
  loading = ref(false),
  error = ref(''),
  filter = ref('全部'),
  category = ref('全部'),
  selected = ref(null)
let controller
async function load() {
  if (demoMode) return
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  error.value = ''
  try {
    remote.value = await api('/badges', undefined, 'GET', signal)
  } catch (e) {
    if (e.name !== 'AbortError') error.value = e.message
  } finally {
    if (!signal.aborted) loading.value = false
  }
}
watch(
  () => state.syncStatus,
  (status, previous) => {
    if (!demoMode && status === 'synced' && previous !== status) load()
  },
)
onMounted(load)
onBeforeUnmount(() => controller?.abort())
const data = computed(() => (demoMode ? localBadges(state, state.demoBadgeAwards) : remote.value))
const items = computed(() => data.value?.items || [])
const visible = computed(() =>
  items.value.filter(
    (b) =>
      (category.value === '全部' || b.category === category.value) &&
      (filter.value === '全部' || (filter.value === '已获得' ? b.earned_at : !b.earned_at)),
  ),
)
const next = computed(() => nextBadge(items.value))
const categories = ['全部', '训练', '坚持', '饮食', '复盘', '恢复']
const units = {
  strength_days: '天',
  valid_weeks: '周',
  longest_streak: '周',
  protein_days: '天',
  journal_days: '天',
  balanced_weeks: '周',
}
const link = (b) =>
  b.metric === 'protein_days'
    ? '/nutrition'
    : b.metric === 'journal_days'
      ? '/training?view=history'
      : '/training'
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">SMALL STEPS, LASTING CHANGE</div>
      <h1>每一份坚持，都有回响<span class="green-dot">.</span></h1>
      <p>徽章记录你的积累，也提醒你给身体留出恢复的时间。</p>
    </div>
    <button v-if="!demoMode" class="btn" :disabled="loading" @click="load">
      <Icon name="refresh" :size="16" />刷新进度
    </button>
  </div>
  <div v-if="error" class="alert">
    徽章暂时无法加载：{{ error }} <button class="text-link" @click="load">重试</button>
  </div>
  <p v-if="loading && !data" class="loading-state">正在整理你的成长足迹…</p>
  <template v-if="data">
    <section class="badges-summary">
      <div>
        <div class="eyebrow">YOUR BADGE COLLECTION</div>
        <h2>今天的你，正在积累明天的底气。</h2>
        <div class="badges-total">
          <strong>{{ data.earned_count }}</strong
          ><span>/ {{ items.length }} 枚徽章</span>
        </div>
        <p>已获得的徽章会保留。调整记录不会抹去你曾经的努力。</p>
      </div>
      <div v-if="next" class="badge-next">
        <BadgeMark :badge="next" />
        <div>
          <span class="tiny">下一站 · {{ next.category }}</span>
          <h3>{{ next.title }}</h3>
          <p>{{ next.description }}</p>
          <div class="progress-track">
            <i :style="{ width: Math.min(100, (next.current / next.target) * 100) + '%' }"></i>
          </div>
          <span class="tiny"
            >{{ Math.min(next.current, next.target) }} / {{ next.target }}
            {{ units[next.metric] }}</span
          ><RouterLink :to="link(next)" class="text-link"
            >继续积累<Icon name="arrow" :size="14"
          /></RouterLink>
        </div>
      </div>
      <div v-else class="badge-next">
        <Icon name="trophy" :size="45" />
        <div>
          <h3>每一枚徽章，都是你的足迹。</h3>
          <p>继续按适合自己的节奏训练。</p>
        </div>
      </div>
    </section>
    <WeeklyGoals :goals="data.weekly_goals" />
    <div class="badge-filters">
      <div class="filter-chips">
        <button
          v-for="name in categories"
          :key="name"
          class="chip"
          :class="{ active: category === name }"
          @click="category = name"
        >
          {{ name }}
        </button>
      </div>
      <select v-model="filter" aria-label="徽章获得状态">
        <option>全部</option>
        <option>已获得</option>
        <option>未获得</option>
      </select>
    </div>
    <div class="badge-grid">
      <button
        v-for="badge in visible"
        :key="badge.id"
        class="badge-card"
        :class="{ earned: badge.earned_at }"
        @click="selected = badge"
      >
        <span class="badge-card-category"
          >{{ badge.category }} ·
          {{
            featuredBadge?.id === badge.id ? '正在佩戴' : badge.earned_at ? '已获得' : '积累中'
          }}</span
        ><BadgeMark :badge="badge" :locked="!badge.earned_at" />
        <h3>{{ badge.title }}</h3>
        <p>{{ badge.description }}</p>
        <template v-if="badge.earned_at"
          ><span class="badge-earned-date"
            ><Icon name="check" :size="13" />{{
              new Date(badge.earned_at).toLocaleDateString('zh-CN')
            }}
            获得</span
          ></template
        ><template v-else
          ><div class="progress-track">
            <i :style="{ width: Math.min(100, (badge.current / badge.target) * 100) + '%' }"></i>
          </div>
          <span class="tiny"
            >{{ Math.min(badge.current, badge.target) }} / {{ badge.target }}
            {{ units[badge.metric] }}</span
          ></template
        >
      </button>
    </div>
    <div v-if="!visible.length" class="panel empty-state">
      <Icon name="trophy" :size="35" />
      <h3>这个分类还没有已获得的徽章</h3>
      <p>从一次训练、一条心得开始，按自己的节奏积累。</p>
      <button
        class="btn"
        @click="
          () => {
            filter = '全部'
            category = '全部'
          }
        "
      >
        查看全部徽章
      </button>
    </div>
    <div class="info-box">
      每周完成至少 2
      个力量日算有效训练周。一天的重复记录不会重复累计；未来日期不计入。连续周按历史最长连续有效周计算。恢复日也值得肯定，无需每天进行力量训练。蛋白徽章沿用当前计划的
      150g 目标，不代表每个人都需要同样的摄入量。
    </div>
  </template>
  <Modal v-if="selected" :title="selected.title" @close="selected = null"
    ><div class="badge-detail">
      <BadgeMark :badge="selected" :locked="!selected.earned_at" /><span class="pill">{{
        selected.category
      }}</span>
      <p>{{ selected.description }}</p>
      <strong>{{
        selected.earned_at
          ? '已获得，值得为自己鼓掌'
          : `当前进度 ${Math.min(selected.current, selected.target)} / ${selected.target} ${units[selected.metric]}`
      }}</strong
      ><button v-if="selected.earned_at" class="btn primary" :disabled="wearing" @click="wear">
        {{
          wearing ? '正在保存…' : featuredBadge?.id === selected.id ? '取消佩戴' : '佩戴这枚徽章'
        }}</button
      ><RouterLink :to="link(selected)" class="btn primary" @click="selected = null"
        >{{ selected.metric === 'protein_days' ? '记录饮食' : '查看训练'
        }}<Icon name="arrow" :size="15"
      /></RouterLink></div
  ></Modal>
</template>
