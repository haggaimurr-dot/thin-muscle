<script setup>
import { computed, onMounted, ref } from 'vue'
import Icon from '../components/Icon.vue'
import BadgeSummary from '../components/BadgeSummary.vue'
import {
  state,
  today,
  week,
  getPlan,
  strengthDone,
  proteinToday,
  proteinDays,
  overload,
  streak,
  isChecked,
} from '../store'
import { PHASES, WEEK_LABEL } from '../data'
import { api } from '../api'
const ranking = ref(null),
  apiError = ref('')
onMounted(async () => {
  try {
    ranking.value = await api('/home/rank')
  } catch (e) {
    apiError.value = e.message
  }
})
const plan = computed(() => getPlan(today)),
  completion = computed(() => Math.round((strengthDone.value / 3) * 100))
const bars = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const p = getPlan(i + 1)
    const total = p.am.length + p.pm.length
    const done = ['am', 'pm']
      .flatMap((s) => p[s].map((e) => isChecked(i + 1, s, e.name)))
      .filter(Boolean).length
    return {
      done,
      total,
      pct: Math.round((done / total) * 100),
      protein: Number(state.protein[week]?.[i + 1] || 0),
    }
  }),
)
const metrics = computed(() => [
  {
    label: '本周力量训练',
    value: strengthDone.value,
    suffix: '/ 3 天',
    icon: 'training',
    note: strengthDone.value >= 2 ? '已达到有效训练周' : '完成 2 天，即是有效训练周',
    tone: 'green',
  },
  {
    label: '渐进超负荷',
    value: overload.value,
    suffix: '个动作',
    icon: 'trend',
    note: '对比上周同动作重量与次数',
    tone: 'orange',
  },
  {
    label: '蛋白达标',
    value: proteinDays.value,
    suffix: '/ 7 天',
    icon: 'nutrition',
    note: '每天 150–155g，给恢复加点料',
    tone: 'blue',
  },
  {
    label: '连续有效训练',
    value: streak.value,
    suffix: '周',
    icon: 'flame',
    note: '每周完成至少 2 次力量训练',
    tone: 'purple',
  },
])
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">YOUR DAILY PROGRESS</div>
      <h1>让进步，成为日常<span class="green-dot">.</span></h1>
      <p>不必每次都突破，持续出现就很了不起。</p>
    </div>
    <RouterLink to="/training" class="btn primary"
      ><Icon name="plus" :size="17" />开始训练</RouterLink
    >
  </div>
  <section class="overview-hero">
    <div class="hero-copy">
      <span class="hero-tag"
        ><span></span>{{ PHASES[state.phase]?.title || PHASES[1].title }} · 正在进行</span
      >
      <h2>练好今天的每一组。<br />剩下的，交给时间。</h2>
      <p>{{ PHASES[state.phase]?.focus }}</p>
      <RouterLink to="/training" class="btn cream"
        >查看今日计划<Icon name="arrow" :size="17"
      /></RouterLink>
      <div class="hero-foot"><span class="hero-line"></span>YOUR ONLY COMPETITION IS YOU.</div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span>
      <div class="dumbbell-art">
        <i class="weight left-weight"></i><i class="weight left-small"></i><i class="bar"></i
        ><i class="weight right-small"></i><i class="weight right-weight"></i>
      </div>
      <span class="art-label">STRONGER<br /><b>EVERY DAY.</b></span
      ><span class="art-coordinate">31°14′ N / KEEP MOVING</span>
    </div>
  </section>
  <div class="metric-grid">
    <article v-for="m in metrics" :key="m.label" class="metric-card">
      <div class="row between">
        <span>{{ m.label }}</span
        ><span class="metric-icon" :class="m.tone"><Icon :name="m.icon" :size="19" /></span>
      </div>
      <div class="metric-value">
        {{ m.value }}<small>{{ m.suffix }}</small>
      </div>
      <p>{{ m.note }}</p>
    </article>
  </div>
  <BadgeSummary />
  <div class="dashboard-grid">
    <section class="panel progress-panel">
      <div class="section-heading">
        <div>
          <h2>这一周，稳步向前</h2>
          <p>从 {{ week }} 开始的每一份努力</p>
        </div>
        <span class="pill">本周</span>
      </div>
      <div class="chart-legend">
        <span><i class="legend-dot"></i>训练完成度</span
        ><span><i class="legend-dot light"></i>每日目标</span>
      </div>
      <div class="week-chart">
        <div class="chart-axis"><span>100%</span><span>50%</span><span>0</span></div>
        <div class="chart-columns">
          <div
            v-for="(bar, i) in bars"
            :key="i"
            class="chart-column"
            :class="{ today: i + 1 === today }"
          >
            <div class="chart-track">
              <div class="chart-fill" :style="{ height: bar.pct + '%' }">
                <span v-if="bar.pct">{{ bar.pct }}%</span>
              </div>
            </div>
            <span>周{{ WEEK_LABEL[i] }}</span
            ><i v-if="i + 1 === today" class="today-dot"></i>
          </div>
        </div>
      </div>
      <div class="chart-summary">
        <span><Icon name="success" :size="17" />按自己的节奏，完成就是进步</span
        ><strong>{{ completion }}%<small> 周目标完成</small></strong>
      </div>
    </section>
    <section class="panel today-panel">
      <div class="section-heading">
        <h2>今日训练</h2>
        <span class="pill green">{{ plan.label }}</span>
      </div>
      <div class="today-date">周{{ WEEK_LABEL[today - 1] }}<span>早晚两练 · 循序渐进</span></div>
      <div v-for="(session, i) in ['am', 'pm']" :key="session" class="session-preview">
        <span class="session-number">0{{ i + 1 }}</span>
        <div>
          <h3>{{ session === 'am' ? '早训 · 主复合' : '晚训 · 辅助与恢复' }}</h3>
          <p>
            {{
              plan[session]
                .map((e) => e.name)
                .slice(0, 2)
                .join(' / ')
            }}
          </p>
          <small>{{ plan[session].length }} 个动作</small>
        </div>
        <Icon name="right" :size="16" />
      </div>
      <RouterLink to="/training" class="btn primary full"
        >进入训练<Icon name="arrow" :size="17"
      /></RouterLink>
    </section>
  </div>
  <div class="dashboard-bottom">
    <section class="panel nutrition-preview">
      <div class="row between">
        <div class="row">
          <span class="metric-icon orange"><Icon name="nutrition" /></span>
          <div>
            <h2>吃够蛋白，恢复到位</h2>
            <p>今日蛋白摄入</p>
          </div>
        </div>
        <RouterLink to="/nutrition" class="text-link"
          >去记录<Icon name="right" :size="15"
        /></RouterLink>
      </div>
      <div class="protein-line">
        <strong>{{ proteinToday }}<small> / 155 g</small></strong
        ><span>{{
          proteinToday >= 150 ? '今日已达标' : '还差 ' + Math.max(0, 150 - proteinToday) + 'g 达标'
        }}</span>
      </div>
      <div class="progress-track">
        <i :style="{ width: Math.min(100, (proteinToday / 155) * 100) + '%' }"></i>
      </div>
    </section>
    <section class="panel rank-preview">
      <div class="section-heading">
        <h2>一起变强</h2>
        <RouterLink to="/community" class="text-link"
          >训练社区<Icon name="right" :size="15"
        /></RouterLink>
      </div>
      <p v-if="apiError" class="muted">社区暂时无法连接，请进入社区重试。</p>
      <div v-else-if="ranking" class="row between">
        <div class="avatar-stack">
          <span
            v-for="(u, i) in ranking.top3"
            :key="u.user_id"
            class="avatar"
            :class="'avatar-' + i"
            >{{ u.name?.slice(0, 1) }}</span
          >
        </div>
        <div>
          <strong>{{ ranking.full.length }} 位训练伙伴</strong>
          <p>记录真实进步，互相激励。</p>
        </div>
        <Icon name="up" :size="26" />
      </div>
      <p v-else>正在连接训练伙伴…</p>
    </section>
  </div>
</template>
