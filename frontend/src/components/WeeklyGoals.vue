<script setup>
import Icon from './Icon.vue'
defineProps({ goals: Object })
</script>
<template>
  <section v-if="goals" class="panel weekly-goals">
    <div class="section-heading">
      <div>
        <h2>本周小目标</h2>
        <p>{{ goals.week }} 开始的一周 · 力量、恢复与复盘，照顾好自己的节奏。</p>
      </div>
      <span class="pill green"
        >{{ goals.items.filter((g) => g.current >= g.target).length }} /
        {{ goals.items.length }} 已达成</span
      >
    </div>
    <div class="weekly-goal-grid">
      <article
        v-for="goal in goals.items"
        :key="goal.id"
        class="weekly-goal"
        :class="{ complete: goal.current >= goal.target }"
      >
        <div class="row between">
          <span class="metric-icon green"><Icon :name="goal.icon" :size="18" /></span
          ><span class="pill">{{ goal.current >= goal.target ? '已达成' : '进行中' }}</span>
        </div>
        <h3>{{ goal.title }}</h3>
        <p>{{ goal.description }}</p>
        <div class="progress-track">
          <i :style="{ width: Math.min(100, (goal.current / goal.target) * 100) + '%' }"></i>
        </div>
        <div class="row between">
          <span class="tiny"
            >{{ Math.min(goal.current, goal.target) }} / {{ goal.target }} {{ goal.unit }}</span
          ><RouterLink :to="goal.action" class="text-link"
            >{{ goal.current >= goal.target ? '查看记录' : '去完成' }}<Icon name="right" :size="13"
          /></RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>
