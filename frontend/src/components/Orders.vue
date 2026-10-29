<script setup>
import { ref, onMounted } from 'vue'
import { api, demoMode } from '../api'
const rows = ref([]),
  cursor = ref(null),
  ledger = ref(null),
  error = ref(''),
  busy = ref(false)
const status = {
  pending: '等待支付确认',
  paid: '已支付',
  failed: '支付失败',
  expired: '支付会话已过期',
}
const money = (n) => (Number(n || 0) / 100).toFixed(2)
async function load(more = false) {
  if (demoMode || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const [orders, income] = await Promise.all([
      api('/payments/orders' + (more && cursor.value ? '?before=' + cursor.value : '')),
      api('/payments/creator-ledger'),
    ])
    rows.value = more ? [...rows.value, ...orders.items] : orders.items
    cursor.value = orders.next_cursor
    ledger.value = income
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
onMounted(() => load())
</script>
<template>
  <section class="panel" aria-label="订单与交易台账">
    <h2>订单与交易台账</h2>
    <p v-if="demoMode">演示复刻不产生真实支付订单。正式账号登录后可查询自己的订单。</p>
    <template v-else
      ><button class="btn" :disabled="busy" @click="load()">刷新订单</button>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="!rows.length && !busy">暂无订单。</p>
      <article v-for="o in rows" :key="o.id" class="panel">
        <h3>{{ o.title }}</h3>
        <p>订单 {{ o.id }} · {{ o.created_at }}</p>
        <p>
          {{ status[o.status] || o.status }} · ¥{{ money(o.amount_fen) }}；已记录退款 ¥{{
            money(o.refunded_fen)
          }}
        </p>
        <p v-if="o.disputes.length">支付平台争议状态：{{ o.disputes.join('、') }}</p>
        <details>
          <summary>支付事件记录（{{ o.events.length }}）</summary>
          <p v-for="e in o.events" :key="e.id">
            {{ e.type }} · {{ new Date(e.created * 1000).toLocaleString('zh-CN') }}
          </p>
        </details>
      </article>
      <button v-if="cursor" class="btn" :disabled="busy" @click="load(true)">加载更多订单</button>
      <div v-if="ledger">
        <h3>创作者账面分成</h3>
        <p>
          交易合计¥{{ money(ledger.gross_fen) }}；平台账面¥{{
            money(ledger.recorded_platform_fen)
          }}；创作者账面¥{{ money(ledger.recorded_creator_fen) }}
        </p>
        <p>{{ ledger.note }}</p>
      </div>
    </template>
  </section>
</template>
