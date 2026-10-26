<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './components/Icon.vue'
import { state, exportData } from './store'
const route = useRoute(),
  menuOpen = ref(false)
const nav = [
  ['/', 'dashboard', '训练总览'],
  ['/training', 'training', '我的训练'],
  ['/nutrition', 'nutrition', '饮食管理'],
  ['/community', 'community', '训练社区'],
  ['/market', 'market', '健身市场'],
  ['/tools', 'tools', '动作实验室'],
]
const date = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(
    new Date(),
  ),
)
</script>
<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ open: menuOpen }">
      <RouterLink to="/" class="brand" @click="menuOpen = false"
        ><span class="brand-mark"><Icon name="training" :size="25" /></span
        ><span>薄肌<span class="brand-en">THIN MUSCLE</span></span></RouterLink
      >
      <div class="nav-caption">你的训练空间</div>
      <nav aria-label="主导航">
        <RouterLink
          v-for="[path, icon, label] in nav"
          :key="path"
          :to="path"
          class="nav-link"
          :class="{ selected: route.path === path }"
          @click="menuOpen = false"
          ><Icon :name="icon" /><span>{{ label }}</span
          ><span v-if="icon === 'tools'" class="nav-tag">AI</span></RouterLink
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="consistency">
          <span class="tiny-label">ONE DAY AT A TIME</span>
          <h3>每一次坚持，<br />都在塑造更好的你。</h3>
          <div class="mini-bars">
            <i v-for="n in 16" :key="n" :style="{ height: 12 + ((n * 17) % 45) + 'px' }"></i>
          </div>
          <span>专注过程，进步自会发生。</span>
        </div>
        <button class="nav-link" @click="exportData"><Icon name="download" />导出我的记录</button>
        <div class="profile">
          <span class="avatar">我</span>
          <div><strong>我的训练空间</strong><small>开发体验账号 · #4</small></div>
          <span class="online-dot"></span>
        </div>
      </div>
    </aside>
    <button
      v-if="menuOpen"
      class="sidebar-shade"
      aria-label="收起导航"
      @click="menuOpen = false"
    ></button>
    <div class="workspace">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-btn mobile-menu" aria-label="展开导航" @click="menuOpen = true">
            <Icon name="menu" /></button
          ><span>我的空间</span><Icon name="right" :size="14" /><strong>{{
            route.meta.title
          }}</strong>
        </div>
        <div class="topbar-right">
          <span class="date-label"><Icon name="calendar" :size="16" />{{ date }}</span
          ><RouterLink to="/training?view=history" class="icon-btn" aria-label="查看训练记录"
            ><Icon name="clock" /></RouterLink
          ><span class="avatar small">我</span>
        </div>
      </header>
      <main id="main-content">
        <div v-if="state.storageError" class="alert">
          浏览器存储已满或不可用，当前修改暂未保存，请先导出记录。
        </div>
        <RouterView />
      </main>
      <footer class="page-footer">
        <span>薄肌 THIN MUSCLE</span><span>比昨天，进步一点点。</span>
      </footer>
    </div>
    <nav class="mobile-nav" aria-label="手机导航">
      <RouterLink
        v-for="[path, icon, label] in nav.slice(0, 5)"
        :key="path"
        :to="path"
        :class="{ selected: route.path === path }"
        ><Icon :name="icon" :size="21" /><span>{{
          label
            .replace('训练总览', '总览')
            .replace('我的训练', '训练')
            .replace('饮食管理', '饮食')
            .replace('训练社区', '社区')
            .replace('健身市场', '市场')
        }}</span></RouterLink
      >
    </nav>
    <Transition name="toast"
      ><div v-if="state.toast" class="toast" role="status">
        <Icon name="success" :size="18" />{{ state.toast }}
      </div></Transition
    >
  </div>
</template>
