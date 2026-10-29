<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { state, ymd, notify } from '../store'
import { recordDate } from '../progress'
const duration = ref(90),
  remaining = ref(90),
  running = ref(false)
let timer, deadline
function tick() {
  remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  if (!remaining.value) {
    pause()
    notify('组间休息计时结束')
  }
}
function start() {
  if (running.value) return
  if (remaining.value <= 0) remaining.value = duration.value
  deadline = Date.now() + remaining.value * 1000
  running.value = true
  timer = setInterval(tick, 250)
}
function pause() {
  clearInterval(timer)
  running.value = false
}
function reset() {
  pause()
  remaining.value = Math.min(3600, Math.max(1, Number(duration.value) || 90))
}
onBeforeUnmount(pause)
const stats = computed(() => {
  const actions = new Map()
  let volume = 0,
    sets = 0,
    excluded = 0
  for (const [key, list] of Object.entries(state.logs)) {
    const match = key.match(/^(.+)\|([1-7])-(am|pm)$/),
      date = match && recordDate(match[1], match[2])
    if (!date || date > ymd()) continue
    for (const e of list) {
      if (![e.weight, e.reps, e.sets].every((v) => /^\d+(\.\d+)?$/.test(String(v)))) {
        excluded++
        continue
      }
      const w = Number(e.weight),
        r = Number(e.reps),
        s = Number(e.sets)
      if (!Number.isFinite(w * r * s) || r <= 0 || s <= 0) {
        excluded++
        continue
      }
      volume += w * r * s
      sets += s
      const previous = actions.get(e.name)
      if (!previous || w > previous.weight || (w === previous.weight && r > previous.reps))
        actions.set(e.name, { name: e.name, weight: w, reps: r, date })
    }
  }
  return { volume: Math.round(volume * 10) / 10, sets, excluded, best: [...actions.values()] }
})
</script>
<template>
  <section class="panel" aria-label="组间计时与训练纪录">
    <details>
      <summary>组间计时、容量与个人最佳</summary>
      <p>本页面组间计时；切换页面会停止。按实际经过时间计算，后台标签页可能延迟提示。</p>
      <label
        >休息秒数<input
          v-model.number="duration"
          type="number"
          min="1"
          max="3600"
          :disabled="running"
      /></label>
      <p role="timer">剩余 {{ remaining }} 秒</p>
      <div class="row wrap">
        <button class="btn" :disabled="running" @click="start">开始或继续计时</button
        ><button class="btn" :disabled="!running" @click="pause">暂停计时</button
        ><button class="btn" @click="reset">重置计时</button>
      </div>
      <p>
        历史可计算容量：{{ stats.volume }} kg·次；{{ stats.sets }} 组。排除
        {{ stats.excluded }} 条非纯数字或无效记录。
      </p>
      <p class="tiny">
        容量=数字重量(kg)×数字次数×组数；自重、辅助、范围、计时项不推算重量，未来记录不计。最佳为该动作最大重量，同重量取更多次数；删除记录自动重算。
      </p>
      <p v-if="!stats.best.length">暂无可计算的数字重量记录。</p>
      <p v-for="b in stats.best" :key="b.name">
        {{ b.name }}个人最佳：{{ b.weight }}kg × {{ b.reps }} · {{ b.date }}
      </p>
    </details>
  </section>
</template>
