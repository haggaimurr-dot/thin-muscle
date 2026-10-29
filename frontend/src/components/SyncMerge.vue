<script setup>
import { ref } from 'vue'
import Modal from './Modal.vue'
import { prepareSyncMerge, commitSyncMerge, notify } from '../store'
const emit = defineEmits(['close'])
const preview = ref(null),
  choices = ref({}),
  error = ref(''),
  busy = ref(false)
const names = {
  logs: '训练记录',
  meals: '饮食记录',
  protein: '蛋白摄入',
  done: '完成状态',
  checks: '动作勾选',
  plans: '训练计划',
  goals: '个人目标',
  nutritionGoals: '营养目标',
  mealTemplates: '餐食模板',
  proteinTarget: '默认蛋白目标',
  videos: '视频绑定',
  ai: '实验室历史',
  phase: '训练阶段',
  hits: '蛋白达标状态',
}
const label = (path) =>
  path
    .split('/')
    .filter(Boolean)
    .map((p) => names[p] || p)
    .join(' / ')
const value = (v) => (v === undefined ? '删除此项' : JSON.stringify(v, null, 2))
async function load() {
  busy.value = true
  error.value = ''
  try {
    preview.value = await prepareSyncMerge()
    choices.value = {}
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function save() {
  busy.value = true
  error.value = ''
  try {
    await commitSyncMerge(preview.value, choices.value)
    notify('合并已提交；新增的本机编辑仍会保留')
    emit('close')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
load()
</script>
<template>
  <Modal title="预览两端记录合并" @close="emit('close')">
    <p>
      以最后一次同步成功的共同副本比较。不同记录与字段可合并；同字段、删除与修改冲突由你选择。尚未同步的修改保留本机，确认后才提交。
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
    <button class="btn" :disabled="busy" @click="load">重新预览合并</button>
    <template v-if="preview">
      <p>
        需要选择的冲突：{{ preview.result.conflicts.length }} 项。没有冲突的字段将保留两端更改。
      </p>
      <fieldset v-for="(c, i) in preview.result.conflicts" :key="c.path">
        <legend>{{ label(c.path) }}</legend>
        <label
          ><input
            v-model="choices[c.path]"
            type="radio"
            :name="'merge-' + i"
            value="local"
          />保留本机内容</label
        >
        <pre style="white-space: pre-wrap; overflow-wrap: anywhere">{{ value(c.local) }}</pre>
        <label
          ><input
            v-model="choices[c.path]"
            type="radio"
            :name="'merge-' + i"
            value="remote"
          />保留云端内容</label
        >
        <pre style="white-space: pre-wrap; overflow-wrap: anywhere">{{ value(c.remote) }}</pre>
      </fieldset>
      <button
        class="btn primary"
        :disabled="busy || preview.result.conflicts.some((c) => !choices[c.path])"
        @click="save"
      >
        确认合并并同步
      </button>
    </template>
  </Modal>
</template>
