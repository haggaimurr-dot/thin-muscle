<script setup>
import { ref, computed } from 'vue'
import { PLAN, VIDEO_LIB } from '../data'
const emit = defineEmits(['use'])
const props = defineProps({ readOnly: Boolean })
const query = ref(''),
  part = ref('全部')
function body(name) {
  return /深蹲|硬拉|腿蹲|提踵|臀桥/.test(name)
    ? '臀腿'
    : /平板/.test(name)
      ? '核心'
      : /侧平举|肩推|外旋|天使/.test(name)
        ? '肩部'
        : /弯举|三头/.test(name)
          ? '手臂'
          : /卧推|俯卧撑|飞鸟/.test(name)
            ? '胸部'
            : /划船|引体/.test(name)
              ? '背部'
              : '全身与恢复'
}
const all = [
  ...new Map(
    Object.values(PLAN)
      .flatMap((p) => [...p.am, ...p.pm])
      .map((e) => [e.name, { ...e, part: body(e.name) }]),
  ).values(),
]
const items = computed(() =>
  all.filter(
    (e) => (part.value === '全部' || e.part === part.value) && e.name.includes(query.value.trim()),
  ),
)
function links(name) {
  return [
    ...(VIDEO_LIB[name] || []),
    ...name.split(' / ').flatMap((n) => VIDEO_LIB[n] || []),
  ].filter((v, i, a) => a.findIndex((w) => w.url === v.url) === i && /^https?:\/\//.test(v.url))
}
</script>
<template>
  <div class="form-stack">
    <p>
      动作来自现有计划，部位为主要归类；说明和现有链接未经过专业教学审核。演示链接不保证是该动作的有效教学内容。
    </p>
    <label>动作库搜索<input v-model="query" type="search" /></label
    ><label
      >按身体部位<select v-model="part">
        <option
          v-for="p in ['全部', '胸部', '背部', '肩部', '手臂', '臀腿', '核心', '全身与恢复']"
          :key="p"
        >
          {{ p }}
        </option>
      </select></label
    >
    <p v-if="!items.length">没有匹配动作。</p>
    <article v-for="ex in items" :key="ex.name">
      <h3>{{ ex.name }} · {{ ex.part }}</h3>
      <p>{{ ex.note || '暂无动作说明' }} · {{ ex.sets }}组 × {{ ex.reps }}</p>
      <a
        v-for="(v, i) in links(ex.name)"
        :key="i"
        :href="v.url"
        target="_blank"
        rel="noopener noreferrer"
        >{{ v.title }}（既有演示链接）↗ </a
      ><button class="btn" :disabled="props.readOnly" @click="emit('use', ex)">
        选择此动作加入计划预览
      </button>
    </article>
  </div>
</template>
