import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Dashboard from './views/Dashboard.vue'
import Training from './views/Training.vue'
import Nutrition from './views/Nutrition.vue'
import Community from './views/Community.vue'
import Market from './views/Market.vue'
import Tools from './views/Tools.vue'
import './style.css'
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
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
