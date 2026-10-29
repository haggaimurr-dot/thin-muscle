<script setup>
import OfflineSettings from '../components/OfflineSettings.vue'
import BackupCenter from '../components/BackupCenter.vue'
import { computed, onMounted, ref } from 'vue'
import Icon from '../components/Icon.vue'
import BadgeSummary from '../components/BadgeSummary.vue'
import ProgressTrends from '../components/ProgressTrends.vue'
import ReminderSettings from '../components/ReminderSettings.vue'
import {
  state,
  today,
  week,
  getPlan,
  strengthDone,
  strengthSchedule,
  strengthDays,
  proteinToday,
  proteinTarget,
  proteinDays,
  overload,
  streak,
  isChecked,
  overloadDetails,
  ymd,
} from '../store'
import { PHASES, WEEK_LABEL } from '../data'
import { api } from '../api'
import { nutritionGoalAt } from '../nutrition-goals'
const targetFor = (day) =>
  nutritionGoalAt(state.nutritionGoals, dateFor(day), state.proteinTarget).protein
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
  completion = computed(() =>
    Math.round((strengthDone.value / Math.max(1, strengthSchedule.value.length)) * 100),
  )
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
    suffix: `/ ${strengthSchedule.value.length} 天`,
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
    note: `每天至少 ${proteinTarget.value}g，给恢复加点料`,
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
function dateFor(day, w = week) {
  const date = new Date(w + 'T12:00:00')
  date.setDate(date.getDate() + day - 1)
  return ymd(date)
}
const weekDetails = computed(() =>
  Object.keys(state.done)
    .sort()
    .reverse()
    .map((w) => ({
      week: w,
      days: strengthDays(w).filter((d) => state.done[w]?.[d]),
    })),
)
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
      <details class="metric-detail">
        <summary>{{ m.label }}规则与明细</summary>
        <template v-if="m.icon === 'training'">
          <p>
            本周力量日（默认周一、三、五，自定义计划按日类型）中，早晚计划的全部动作均勾选完成才计 1
            天；记录组数本身不代表完成。周目标 {{ strengthSchedule.length }} 天，有效周至少 2
            天。公共榜单和徽章仍使用其固定日期规则。
          </p>
          <p v-for="d in strengthSchedule" :key="d">
            {{ dateFor(d) }} · {{ state.done[week]?.[d] ? '已完成' : '未完成' }}
          </p>
          <RouterLink to="/training?view=week">查看计划与完成勾选</RouterLink>
        </template>
        <template v-else-if="m.icon === 'trend'">
          <p>
            按本地周一至周日，与上周同名动作的最高重量比较；重量相同时比较次数。缺少可解析的数字重量或次数不计，无上周记录不计进步。
          </p>
          <p v-if="!overloadDetails.length">暂无可比较的重量与次数记录。</p>
          <p v-for="e in overloadDetails" :key="e.name">
            {{ e.name }}：本周 {{ e.current.load }}kg × {{ e.current.reps }}；上周
            {{ e.previous ? `${e.previous.load}kg × ${e.previous.reps}` : '无记录' }} ·
            {{ e.improved ? '进步' : '未计进步' }}
          </p>
          <RouterLink to="/training?view=history">查看来源训练记录</RouterLink>
        </template>
        <template v-else-if="m.icon === 'nutrition'">
          <p>
            本周每天蛋白累计达到当日生效目标计为达标；今日目标
            {{ proteinTarget }}g，来源包括餐食计入与手动克数调整。按设备本地日期及周一至周日统计。
          </p>
          <p v-for="d in 7" :key="d">
            {{ dateFor(d) }} · {{ Number(state.protein[week]?.[d] || 0) }}g ·
            {{ Number(state.protein[week]?.[d] || 0) >= targetFor(d) ? '达标' : '未达标' }}
          </p>
          <RouterLink to="/nutrition">查看餐食来源及调整</RouterLink>
        </template>
        <template v-else>
          <p>
            从本周向前连续计算，每周力量日（包含自定义安排）完成至少 2
            天才是有效周；遇到首个无效周停止。本周尚未达标时显示 0 周。
          </p>
          <p v-if="!weekDetails.length">暂无完成记录。</p>
          <p v-for="w in weekDetails" :key="w.week">
            {{ w.week }} 起 · {{ w.days.length }} / {{ strengthDays(w.week).length }} 天 ·
            {{ w.days.length >= 2 ? '有效周' : '无效周' }}
          </p>
        </template>
      </details>
    </article>
  </div>
  <BadgeSummary />
  <ProgressTrends />
  <ReminderSettings />
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
          <small
            >{{ plan[session].length }} 个动作 · 已完成
            {{ plan[session].filter((e) => isChecked(today, session, e.name)).length }}</small
          >
          <p v-if="!plan[session].some((e) => isChecked(today, session, e.name))" class="tiny">
            还未勾选完成，开始训练后记录第一组。
          </p>
          <RouterLink
            :to="{ path: '/training', query: { date: ymd(), session } }"
            class="text-link"
            >{{ session === 'am' ? '记录今日早训' : '记录今日晚训' }}</RouterLink
          >
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
        <RouterLink
          :to="{ path: '/nutrition', query: { date: ymd(), record: 'manual' } }"
          class="text-link"
          >去记录<Icon name="right" :size="15"
        /></RouterLink>
      </div>
      <div class="protein-line">
        <strong
          >{{ proteinToday }}<small> / {{ proteinTarget }} g</small></strong
        ><span>{{
          proteinToday >= proteinTarget
            ? '今日已达标'
            : '还差 ' + Math.max(0, proteinTarget - proteinToday) + 'g 达标'
        }}</span>
      </div>
      <div class="progress-track">
        <i :style="{ width: Math.min(100, (proteinToday / proteinTarget) * 100) + '%' }"></i>
      </div>
      <p v-if="!proteinToday" class="tiny">今天还未记录蛋白，点击“去记录”添加第一餐。</p>
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
  <BackupCenter />
  <OfflineSettings />
</template>
