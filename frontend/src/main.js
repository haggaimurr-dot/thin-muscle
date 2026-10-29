import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Dashboard from './views/Dashboard.vue'
import Badges from './views/Badges.vue'
import Training from './views/Training.vue'
import Nutrition from './views/Nutrition.vue'
import Community from './views/Community.vue'
import Market from './views/Market.vue'
import Tools from './views/Tools.vue'
import './style.css'
import { applyTheme } from './store'
applyTheme()
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/badges', component: Badges, meta: { title: '成长徽章', subtitle: 'ACHIEVEMENTS' } },
    { path: '/', component: Dashboard, meta: { title: '训练总览', subtitle: 'OVERVIEW' } },
    {
      path: '/training',
      component: Training,
      meta: { title: '我的训练', subtitle: 'MY TRAINING' },
    },
    {
      path: '/nutrition',
      component: Nutrition,
      meta: { title: '饮食管理', subtitle: 'NUTRITION' },
    },
    {
      path: '/community',
      component: Community,
      meta: { title: '训练社区', subtitle: 'COMMUNITY' },
    },
    { path: '/market', component: Market, meta: { title: '健身市场', subtitle: 'MARKETPLACE' } },
    { path: '/tools', component: Tools, meta: { title: '动作实验室', subtitle: 'MOVEMENT LAB' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
createApp(App).use(router).mount('#app')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => {
      const announce = () => {
        if (reg.waiting)
          window.dispatchEvent(new CustomEvent('pwa-update', { detail: reg.waiting }))
      }
      announce()
      reg.addEventListener('updatefound', () =>
        reg.installing?.addEventListener('statechange', announce),
      )
    })
    .catch(() => {})
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (
      navigator.serviceWorker.controller &&
      !reloading &&
      sessionStorage.getItem('tm_pwa_active')
    ) {
      reloading = true
      location.reload()
    }
    sessionStorage.setItem('tm_pwa_active', '1')
  })
}
