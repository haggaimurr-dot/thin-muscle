<script setup>
import { ref } from 'vue'
import { state, notify, uid, ymd, monday, changeProtein } from '../store'
import { api } from '../api'
import { validBarcode } from '../barcode'
const props = defineProps({ enabled: Boolean })
const emit = defineEmits(['use', 'manual'])
const code = ref(''),
  binding = ref(''),
  image = ref(null),
  consent = ref(false),
  rows = ref([]),
  busy = ref(false),
  error = ref(''),
  date = ref(ymd())
function lookup() {
  error.value = ''
  if (!validBarcode(code.value)) {
    error.value = '条码格式或校验位无效'
    return
  }
  const meal = state.mealTemplates.find((t) => t.barcode === code.value)
  if (meal) emit('use', meal)
  else error.value = '个人食物库未收录此条码，可手动记录并保存为模板；未连接公共条码数据库。'
}
function bind() {
  if (!validBarcode(code.value)) {
    error.value = '条码格式或校验位无效'
    return
  }
  const meal = state.mealTemplates.find((t) => t.template_id === binding.value)
  if (!meal) return
  if (
    state.mealTemplates.some((t) => t.template_id !== meal.template_id && t.barcode === code.value)
  ) {
    error.value = '此条码已绑定其他模板'
    return
  }
  meal.barcode = code.value
  notify('条码已绑定到个人餐食模板')
}
async function scan(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  try {
    if (!globalThis.BarcodeDetector)
      throw new Error('此浏览器不支持图片条码解析，请手动输入条码数字')
    if (file.size > 8 * 1024 * 1024) throw new Error('图片不能超过8MB')
    const formats = await BarcodeDetector.getSupportedFormats()
    const accepted = ['ean_13', 'ean_8', 'upc_a'].filter((f) => formats.includes(f))
    if (!accepted.length) throw new Error('此浏览器不支持商品条码格式，请手动输入')
    const bitmap = await createImageBitmap(file)
    try {
      const found = await new BarcodeDetector({ formats: accepted }).detect(bitmap)
      const codes = [...new Set(found.map((f) => f.rawValue).filter(validBarcode))]
      if (codes.length !== 1) throw new Error('未找到唯一有效商品条码，请裁剪后重试或手动输入')
      code.value = codes[0]
      lookup()
    } finally {
      bitmap.close()
    }
  } catch (e) {
    error.value = e.message
  }
}
async function recognize() {
  if (!image.value || !consent.value || busy.value || !props.enabled) return
  busy.value = true
  error.value = ''
  try {
    if (image.value.size > 8 * 1024 * 1024) throw new Error('图片不能超过8MB')
    const body = new FormData()
    body.append('file', image.value)
    body.append('consent', 'true')
    body.append('mode', 'multi')
    const result = await api('/ai/food', body)
    if (!Array.isArray(result.foods) || !result.foods.length || result.foods.length > 20)
      throw new Error('服务未返回有效食物候选')
    rows.value = result.foods.map((f) => ({ ...f, meal_id: uid(), portion: 1 }))
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
function addBlank() {
  if (rows.value.length < 20)
    rows.value.push({
      meal_id: uid(),
      title: '',
      base_kcal: 0,
      base_protein_g: 0,
      base_carb_g: 0,
      base_fat_g: 0,
      portion: 1,
    })
}
function confirm() {
  const d = new Date(date.value + 'T12:00:00')
  if (
    !date.value ||
    Number.isNaN(d.getTime()) ||
    rows.value.some(
      (r) =>
        !r.title?.trim() ||
        ['base_kcal', 'base_protein_g', 'base_carb_g', 'base_fat_g', 'portion'].some(
          (k) => typeof r[k] !== 'number' || !Number.isFinite(r[k]) || r[k] < 0,
        ) ||
        r.portion <= 0,
    )
  ) {
    error.value = '请修正各食物名称、非负营养值、份量及日期'
    return
  }
  const w = monday(d),
    day = d.getDay() || 7
  for (const row of rows.value) {
    const grams = Math.round(row.base_protein_g * row.portion * 10) / 10
    state.meals.unshift({
      ...row,
      date: date.value,
      week: w,
      day,
      created_at: new Date().toISOString(),
      source: 'multi-corrected',
      is_estimate: true,
      logged_to_protein: true,
      logged_grams: grams,
    })
    changeProtein(grams, day, w)
  }
  rows.value = []
  notify('已按修正结果逐项记入餐食')
}
const fields = {
  base_kcal: '热量',
  base_protein_g: '蛋白',
  base_carb_g: '碳水',
  base_fat_g: '脂肪',
  portion: '份量',
}
</script>
<template>
  <section class="panel" aria-label="条码与多食物记录">
    <h2>商品条码与多食物</h2>
    <label>商品条码数字<input v-model="code" inputmode="numeric" maxlength="14" /></label
    ><button class="btn" @click="lookup">查询个人条码食物</button>
    <label>上传商品条码图片<input type="file" accept="image/*" @change="scan" /></label>
    <label
      >绑定个人餐食模板<select v-model="binding">
        <option value="">选择已核对营养的模板</option>
        <option v-for="t in state.mealTemplates" :key="t.template_id" :value="t.template_id">
          {{ t.title }}
        </option>
      </select></label
    ><button class="btn" :disabled="!binding" @click="bind">保存条码绑定</button
    ><button class="btn" @click="emit('manual')">未知条码手动记录</button>
    <p class="tiny">
      条码只在本机图片中解析，不上传；食品资料来自你自己保存的模板。公共条码数据库尚未接入。
    </p>
    <h3>多食物拆分</h3>
    <p>识别仅为候选估值，没有可核验置信度；逐项修正并确认后才计入。也可手动拆分。</p>
    <p v-if="!enabled">识别服务未配置，当前可手动拆分记录。</p>
    <label
      >多食物照片<input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        @change="image = $event.target.files[0]"
    /></label>
    <label><input v-model="consent" type="checkbox" />同意发送本次多食物照片给识别服务商</label
    ><button class="btn" :disabled="!enabled || !image || !consent || busy" @click="recognize">
      识别多个食物
    </button>
    <button class="btn" :disabled="rows.length >= 20" @click="addBlank">手动增加拆分食物</button>
    <label v-if="rows.length">拆分餐食日期<input v-model="date" type="date" required /></label>
    <article v-for="(r, i) in rows" :key="r.meal_id" class="panel">
      <label>拆分食物名称<input v-model="r.title" maxlength="128" /></label>
      <div class="row wrap">
        <label v-for="(label, key) in fields" :key="key"
          >拆分{{ label }}<input v-model.number="r[key]" type="number" min="0" step="0.1"
        /></label>
      </div>
      <button class="btn" @click="rows.splice(i, 1)">移除此候选</button>
    </article>
    <button v-if="rows.length" class="btn primary" @click="confirm">确认逐项计入</button>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>
