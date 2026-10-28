<script setup>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import { api, demoMode } from '../api'
import { state, proteinToday, changeProtein, notify, uid, week, today, ymd, monday } from '../store'
import { MEAL_MOCK_FOOD, MEAL_MOCK_LABEL } from '../data'
const consent = ref(false),
  foodEnabled = ref(false)
onMounted(async () => {
  try {
    foodEnabled.value = (await api('/auth/capabilities')).food_recognition
  } catch {
    foodEnabled.value = false
  }
})
const amount = ref(25),
  mode = ref('food'),
  file = ref(null),
  preview = ref(''),
  result = ref(null),
  busy = ref(false),
  timer = ref(null)
const todayMeals = computed(() => state.meals.filter((m) => mealDate(m) === ymd()))
const kcal = computed(() =>
  Math.round(
    todayMeals.value
      .filter((m) => m.logged_to_protein)
      .reduce((n, m) => n + m.base_kcal * (m.portion || 1), 0),
  ),
)
function pick(e) {
  const f = e.target.files[0]
  if (!f) return
  if (!f.type.startsWith('image/') || f.size > 8 * 1024 * 1024) {
    notify('请选择 8MB 以内的图片')
    e.target.value = ''
    return
  }
  if (preview.value) URL.revokeObjectURL(preview.value)
  file.value = f
  preview.value = URL.createObjectURL(f)
  result.value = null
}
async function identify() {
  if (!demoMode) {
    if (!file.value || !consent.value || busy.value) return
    busy.value = true
    try {
      const form = new FormData()
      form.append('file', file.value)
      form.append('mode', mode.value)
      form.append('consent', 'true')
      const response = await api('/ai/food', form)
      state.meals.unshift({
        ...response,
        meal_id: uid(),
        date: ymd(),
        week,
        day: today,
        created_at: new Date().toISOString(),
        file_name: file.value.name,
        logged_to_protein: false,
      })
      result.value = state.meals[0]
      notify('识别完成，营养数值仅为估计')
    } catch (error) {
      notify(error.message)
    } finally {
      busy.value = false
    }
    return
  }
  busy.value = true
  timer.value = setTimeout(() => {
    result.value = {
      ...(mode.value === 'food' ? MEAL_MOCK_FOOD : MEAL_MOCK_LABEL),
      meal_id: uid(),
      date: ymd(),
      week,
      day: today,
      created_at: new Date().toISOString(),
      file_name: file.value?.name || '演示餐食',
      logged_to_protein: false,
    }
    state.meals.unshift(result.value)
    result.value = state.meals[0]
    busy.value = false
    notify('演示分析已完成')
  }, 700)
}
function scaled(key) {
  return Math.round(result.value[key] * result.value.portion * 10) / 10
}
function mealDate(meal) {
  return meal.date || ymd(new Date(meal.created_at))
}
function addMeal() {
  if (result.value.logged_to_protein) return
  const grams = scaled('base_protein_g')
  const recordedDate = new Date(mealDate(result.value) + 'T12:00:00')
  const recordedWeek = monday(recordedDate),
    recordedDay = recordedDate.getDay() || 7
  changeProtein(grams, recordedDay, recordedWeek)
  result.value.logged_to_protein = true
  result.value.logged_grams = grams
  result.value.week = recordedWeek
  result.value.day = recordedDay
  notify('已记入 ' + mealDate(result.value) + ' 的蛋白')
}
function undo(m) {
  changeProtein(
    -(m.logged_grams ?? m.base_protein_g * m.portion),
    m.day || new Date(m.created_at).getDay() || 7,
    m.week || monday(new Date(m.created_at)),
  )
  m.logged_to_protein = false
  notify('已撤销这份饮食记录')
}
const manualOpen = ref(false)
const manual = ref({
  title: '',
  date: ymd(),
  protein: 0,
  kcal: 0,
  carb: 0,
  fat: 0,
  portion: 1,
  note: '',
})
function saveManualMeal() {
  const date = new Date(manual.value.date + 'T12:00:00')
  if (
    !manual.value.title.trim() ||
    Number.isNaN(date.getTime()) ||
    ymd(date) !== manual.value.date ||
    manual.value.date > ymd()
  ) {
    notify('请填写饮食名称及有效的已发生日期')
    return
  }
  const m = manual.value
  if (
    [m.protein, m.kcal, m.carb, m.fat, m.portion].some(
      (v) => !Number.isFinite(Number(v)) || Number(v) < 0,
    ) ||
    Number(m.portion) <= 0
  ) {
    notify('请填写有效的营养数值和份量')
    return
  }
  state.meals.unshift({
    meal_id: uid(),
    title: m.title.trim(),
    date: m.date,
    created_at: new Date().toISOString(),
    week: monday(date),
    day: date.getDay() || 7,
    source: 'manual',
    status: 'done',
    base_kcal: Number(m.kcal),
    base_protein_g: Number(m.protein),
    base_carb_g: Number(m.carb),
    base_fat_g: Number(m.fat),
    portion: Number(m.portion),
    advice: m.note,
    sugar_warn: false,
    logged_to_protein: false,
  })
  result.value = state.meals[0]
  addMeal()
  manualOpen.value = false
  manual.value = {
    title: '',
    date: ymd(),
    protein: 0,
    kcal: 0,
    carb: 0,
    fat: 0,
    portion: 1,
    note: '',
  }
}
function setMode(m) {
  mode.value = m
  result.value = null
}
onBeforeUnmount(() => {
  clearTimeout(timer.value)
  if (preview.value) URL.revokeObjectURL(preview.value)
})
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">FUEL YOUR PROGRESS</div>
      <h1>好好吃，才能好好练<span class="green-dot">.</span></h1>
      <p>吃够蛋白，适度碳水，给每一次训练足够的支持。</p>
    </div>
    <span class="pill green"><Icon name="leaf" :size="15" />每日目标 150–155g</span>
  </div>
  <div class="nutrition-layout">
    <section class="panel protein-card">
      <div class="section-heading">
        <h2>今日蛋白</h2>
        <Icon name="nutrition" />
      </div>
      <div
        class="protein-ring"
        :style="{ '--progress': Math.min(100, (proteinToday / 155) * 100) + '%' }"
      >
        <div>
          <strong>{{ proteinToday }}</strong
          ><span>/ 155 g</span>
        </div>
      </div>
      <h3>
        {{ proteinToday >= 150 ? '今日目标达成，恢复更有底气。' : '一点一点，吃够今天的目标。' }}
      </h3>
      <p>
        {{
          proteinToday >= 150
            ? '坚持均衡饮食，明天继续。'
            : '还差 ' + Math.max(0, 150 - proteinToday) + 'g 达到最低目标'
        }}
      </p>
      <div class="quick-add">
        <button
          v-for="n in [10, 25, 40]"
          :key="n"
          class="btn"
          @click="
            () => {
              changeProtein(n)
              notify('蛋白 +' + n + 'g')
            }
          "
        >
          +{{ n }}g
        </button>
      </div>
      <form
        class="row"
        @submit.prevent="
          () => {
            changeProtein(Number(amount))
            notify('蛋白记录已更新')
          }
        "
      >
        <label class="sr-only" for="protein-amount">调整蛋白克数</label
        ><input
          id="protein-amount"
          v-model="amount"
          type="number"
          min="-1000"
          max="1000"
          step="0.1"
          required
        /><button class="btn primary" type="submit">调整克数</button>
      </form>
      <p class="tiny">输入负数可以修正记录，刷新后仍保留。</p>
      <div class="nutrition-note">
        <Icon name="flame" />
        <div>
          <strong>{{ kcal }} kcal</strong><span>今日饮食热量</span>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>饮食识别</h2>
          <p>食物照片或营养成分表，辅助了解摄入。</p>
        </div>
        <span class="pill orange">{{
          demoMode ? '演示功能' : foodEnabled ? 'AI 营养估算' : '待开通'
        }}</span>
      </div>
      <div class="segmented">
        <button :class="{ active: mode === 'food' }" @click="setMode('food')">餐食照片</button
        ><button :class="{ active: mode === 'label' }" @click="setMode('label')">营养成分表</button>
      </div>
      <label class="upload-area"
        ><input type="file" accept="image/*" @change="pick" /><img
          v-if="preview"
          :src="preview"
          alt="已选饮食照片"
        /><template v-else
          ><span class="upload-icon"><Icon name="upload" :size="28" /></span
          ><strong>添加一张{{ mode === 'food' ? '餐食照片' : '营养成分表' }}</strong
          ><span>点击选择图片 · JPG / PNG 等 · 最大 8MB</span></template
        ></label
      >
      <div class="info-box">
        {{
          demoMode
            ? '当前为演示模式，不会上传图片。'
            : '经你同意后，图片将发送给 AI 服务商分析；结果仅为营养估值，请自行核对。'
        }}
      </div>
      <label v-if="!demoMode && foodEnabled" class="row"
        ><input v-model="consent" type="checkbox" />同意将所选图片发送给 AI 服务商分析</label
      ><button
        class="btn primary full"
        :disabled="busy || (!demoMode && (!foodEnabled || !file || !consent))"
        @click="identify"
      >
        {{
          busy
            ? '正在分析…'
            : !demoMode
              ? foodEnabled
                ? '识别所选图片'
                : '饮食识别尚未开通'
              : file
                ? '查看演示分析'
                : '体验演示分析'
        }}
      </button>
      <div v-if="result" class="meal-result">
        <div class="section-heading">
          <h3>{{ result.title }}</h3>
          <span class="pill">{{
            result.source === 'manual'
              ? '手动记录'
              : result.is_estimate
                ? 'AI 估算结果'
                : '演示结果'
          }}</span>
        </div>
        <label class="row between"
          >份量<select v-model.number="result.portion" :disabled="result.logged_to_protein">
            <option :value="0.5">半份</option>
            <option :value="1">一份</option>
            <option :value="1.5">一份半</option>
            <option :value="2">两份</option>
          </select></label
        >
        <div class="macro-grid">
          <div
            v-for="[key, label, unit] in [
              ['base_kcal', '热量', 'kcal'],
              ['base_protein_g', '蛋白', 'g'],
              ['base_carb_g', '碳水', 'g'],
              ['base_fat_g', '脂肪', 'g'],
            ]"
            :key="key"
          >
            <strong>{{ scaled(key) }}</strong
            ><span>{{ label }} · {{ unit }}</span>
          </div>
        </div>
        <p>{{ result.advice }}</p>
        <p v-if="result.sugar_warn" class="alert">配料包含添加糖，请留意摄入。</p>
        <button class="btn primary full" :disabled="result.logged_to_protein" @click="addMeal">
          {{
            result.logged_to_protein
              ? '已记入蛋白'
              : mealDate(result) === ymd()
                ? '记入今日蛋白'
                : '记入 ' + mealDate(result) + ' 的蛋白'
          }}
        </button>
      </div>
    </section>
  </div>
  <section class="panel">
    <div class="section-heading">
      <h2>饮食记录</h2>
      <div class="row">
        <span class="pill">{{ state.meals.length }} 条记录</span
        ><button class="btn primary" @click="manualOpen = true">
          <Icon name="plus" :size="16" />手动记录饮食
        </button>
      </div>
    </div>
    <p v-if="!state.meals.length" class="empty-state">
      手动记下今天的一餐，从了解自己吃了什么开始。
    </p>
    <div v-for="m in state.meals" :key="m.meal_id" class="history-row">
      <div>
        <strong>{{ m.title }}</strong>
        <p>
          {{ mealDate(m) }} · {{ m.portion }} 份 · 蛋白
          {{ Math.round(m.base_protein_g * m.portion) }}g ·
          {{ m.logged_to_protein ? '已记入' : '未记入' }}
        </p>
      </div>
      <div class="row">
        <button class="btn small-btn" @click="result = m">查看</button
        ><button v-if="m.logged_to_protein" class="text-link" @click="undo(m)">撤销计入</button>
      </div>
    </div>
  </section>
  <Modal v-if="manualOpen" title="手动记录饮食" @close="manualOpen = false"
    ><form class="form-stack" @submit.prevent="saveManualMeal">
      <label
        >饮食名称<input
          v-model="manual.title"
          required
          maxlength="128"
          placeholder="例如 鸡胸饭" /></label
      ><label>饮食日期<input v-model="manual.date" type="date" :max="ymd()" required /></label>
      <div class="two-col">
        <label
          >每份热量（kcal）<input
            v-model.number="manual.kcal"
            type="number"
            min="0"
            max="10000"
            step="0.1"
            required /></label
        ><label
          >每份蛋白质（g）<input
            v-model.number="manual.protein"
            type="number"
            min="0"
            max="1000"
            step="0.1"
            required /></label
        ><label
          >每份碳水（g）<input
            v-model.number="manual.carb"
            type="number"
            min="0"
            max="2000"
            step="0.1"
            required /></label
        ><label
          >每份脂肪（g）<input
            v-model.number="manual.fat"
            type="number"
            min="0"
            max="1000"
            step="0.1"
            required
        /></label>
      </div>
      <label
        >食用份数<input
          v-model.number="manual.portion"
          type="number"
          min="0.1"
          max="10"
          step="0.1"
          required /></label
      ><label>饮食备注<textarea v-model="manual.note" rows="2" maxlength="500"></textarea></label
      ><button class="btn primary full" type="submit">保存并计入蛋白</button>
    </form></Modal
  >
</template>
