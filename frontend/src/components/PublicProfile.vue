<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
const emit = defineEmits(['saved'])
const form = ref(null),
  error = ref(''),
  busy = ref(false),
  message = ref('')
async function load() {
  try {
    form.value = await api('/home/profile')
  } catch (e) {
    error.value = e.message
  }
}
async function save() {
  busy.value = true
  error.value = ''
  try {
    await api('/home/profile', form.value, 'PUT')
    message.value = '公开资料已保存'
    emit('saved')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<template>
  <section class="panel" aria-label="我的公开资料">
    <h2>我的公开资料</h2>
    <p>昵称会公开；头像和简介由下方开关控制。体重公开与参榜设置在榜单中调整。</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <button v-if="!form" class="btn" @click="load">重试加载资料</button>
    <form v-if="form" class="form-stack" @submit.prevent="save">
      <label>公开昵称<input v-model="form.nickname" required maxlength="64" /></label
      ><label>头像HTTPS地址<input v-model="form.avatar_url" type="url" maxlength="512" /></label
      ><label>个人简介<textarea v-model="form.bio" maxlength="300" /></label
      ><label><input v-model="form.show_avatar" type="checkbox" />公开我的头像</label
      ><label><input v-model="form.show_bio" type="checkbox" />公开我的简介</label
      ><button class="btn" :disabled="busy">保存公开资料</button>
      <p v-if="message" role="status">{{ message }}</p>
    </form>
  </section>
</template>
