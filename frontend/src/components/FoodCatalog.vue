<script setup>
import { computed, ref, watch } from 'vue'
import {
  categories,
  findFoods,
  foodSource,
  foods,
  quickFoods,
  rowGrams,
  sumFoods,
} from '../food-catalog'
import { state, notify, uid, ymd, monday, changeProtein } from '../store'
import UserFoods from './UserFoods.vue'

const query = ref(''),
  category = ref('全部'),
  page = ref(1),
  rows = ref([]),
  source = ref('reference')
const matches = computed(() => findFoods(query.value, category.value))
const pageSize = 18
const visibleFoods = computed(() =>
  matches.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
const pageCount = computed(() => Math.max(1, Math.ceil(matches.value.length / pageSize)))
watch([query, category], () => {
  page.value = 1
})
const total = computed(() => sumFoods(rows.value))
const invalid = computed(() => rows.value.some((row) => rowGrams(row) === null))
const recordedKcal = computed(() =>
  state.meals
    .filter((m) => m.logged_to_protein && (m.date || ymd(new Date(m.created_at))) === ymd())
    .reduce((n, m) => n + m.base_kcal * (m.portion || 1), 0),
)
const fmt = (n, digits = 1) => Math.round((n + Number.EPSILON) * 10 ** digits) / 10 ** digits
function add(food, household = false) {
  if (rows.value.length >= 50) {
    notify('一次最多组合50项食品，请先确认记录')
    return
  }
  rows.value.push({
    id: uid(),
    food,
    unit: household && food.unit ? food.unit : 'g',
    quantity: household && food.unit ? 1 : 100,
    unitGrams: food.grams || 100,
  })
}
function switchUnit(row) {
  const grams = rowGrams({ ...row, unit: row.unit === 'g' ? row.food.unit : 'g' })
  row.quantity = row.unit === 'g' ? grams || 100 : (grams || row.unitGrams) / row.unitGrams
}
function confirm() {
  if (!rows.value.length || invalid.value) return
  const now = new Date(),
    date = ymd(now),
    week = monday(now),
    day = now.getDay() || 7
  const meals = rows.value.map((row) => {
    const grams = rowGrams(row),
      food = row.food
    const protein = Math.round(((food.protein * grams) / 100) * 10) / 10
    return {
      meal_id: uid(),
      title: food.name,
      date,
      week,
      day,
      created_at: now.toISOString(),
      source: food.userFood ? 'user-food' : food.derived ? 'portion-estimate' : 'food-catalog',
      status: 'done',
      base_kcal: food.kcal,
      base_protein_g: food.protein,
      base_carb_g: food.carb,
      base_fat_g: food.fat,
      portion: grams / 100,
      is_estimate: true,
      sugar_warn: false,
      logged_to_protein: true,
      logged_grams: protein,
      unknown_macros: food.unknownMacros || [],
      advice: `${fmt(grams, 2)}g 可食部分${row.unit !== 'g' ? `（${row.quantity}${row.unit}，每${row.unit}${row.unitGrams}g，参考份量）` : ''}；每100g ${fmt(food.kcal)} kcal。来源：${food.sourceLabel || foodSource.source}，编号 ${food.sourceId || food.id}。${food.derived ? food.description : ''}${food.unknownMacros?.length ? '未提供的营养值未参与合计；仅记录已知营养。' : ''}`,
    }
  })
  state.meals.unshift(...meals)
  changeProtein(
    meals.reduce((sum, meal) => sum + meal.logged_grams, 0),
    day,
    week,
  )
  rows.value = []
  notify(`已将${meals.length}项食品计入今日饮食`)
}
</script>

<template>
  <section class="panel calorie-panel" aria-label="热量评估">
    <div class="section-heading">
      <div>
        <div class="eyebrow">TODAY’S FOOD</div>
        <h2>热量评估</h2>
        <p>选今天实际吃的食品，按克称重或用常见份量估算。</p>
      </div>
      <span class="pill green">{{ foods.length.toLocaleString() }} 种食品</span>
    </div>
    <div class="calorie-stats" aria-live="polite">
      <div>
        <span>今日已记录</span><strong>{{ fmt(recordedKcal) }} <small>kcal</small></strong>
      </div>
      <div>
        <span>本次食品组合 · 尚未计入</span
        ><strong>{{ fmt(total.kcal) }} <small>kcal</small></strong>
      </div>
      <div>
        <span>确认后今日合计</span
        ><strong>{{ fmt(recordedKcal + total.kcal) }} <small>kcal</small></strong>
      </div>
    </div>
    <div class="calorie-workspace">
      <div class="food-browser">
        <div class="portion-scenarios">
          <h3>日常餐饮，快速估算</h3>
          <p>份量按可食部分估计，可改大小和数量。米饭按熟重；面条不含汤、浇头和额外用油。</p>
          <div class="portion-presets">
            <button
              v-for="food in quickFoods"
              :key="food.id"
              class="portion-preset"
              :aria-label="`添加一${food.unit}${food.name}`"
              @click="add(food, true)"
            >
              <strong>一{{ food.unit }}{{ food.name.split('（')[0] }}</strong>
              <span>约 {{ food.grams }}g · {{ fmt((food.kcal * food.grams) / 100) }} kcal</span>
              <small>＋ 加入组合</small>
            </button>
          </div>
        </div>
        <div class="food-directory">
          <div class="segmented" aria-label="食品来源">
            <button :class="{ active: source === 'reference' }" @click="source = 'reference'">
              基础食品
            </button>
            <button :class="{ active: source === 'user' }" @click="source = 'user'">
              自建与共享食品
            </button>
          </div>
          <div class="food-filters">
            <label
              >搜索食品<input v-model="query" type="search" placeholder="米饭、面、馍、面包…"
            /></label>
            <label
              >食品分类<select v-model="category" aria-label="食品分类">
                <option>全部</option>
                <option v-for="c in categories" :key="c">{{ c }}</option>
              </select></label
            >
          </div>
          <UserFoods
            v-if="source === 'user'"
            :query="query"
            :category="category"
            @select="add($event)"
          />
          <template v-else>
            <p class="tiny">
              共 {{ matches.length }} 项 · 热量单位 kcal（千卡）· 每克热量 = 每100克热量 ÷ 100
            </p>
            <div class="food-grid">
              <article v-for="food in visibleFoods" :key="food.id" class="food-card">
                <span class="tiny">{{ food.category }}</span>
                <h3>{{ food.name }}</h3>
                <strong>{{ fmt(food.kcal / 100, 3) }} <small>kcal / 克</small></strong>
                <p>{{ fmt(food.kcal) }} kcal / 100g</p>
                <details>
                  <summary>食材状态与来源</summary>
                  <p>{{ food.description || '原资料未标注处理状态，请核对食品名称。' }}</p>
                  <p>
                    原名：{{ food.originalName }} · 来源编号 {{ food.sourceId || food.id
                    }}{{ food.derived ? ' · 配方估算' : '' }}
                  </p>
                </details>
                <button class="btn small-btn" :aria-label="`添加${food.name}`" @click="add(food)">
                  ＋ 加入组合
                </button>
              </article>
            </div>
            <p v-if="!matches.length" class="empty-state">
              没有找到匹配食品，试试其他名称或分类，也可以使用下方手动记录。
            </p>
            <div class="row between food-pagination">
              <button class="btn small-btn" :disabled="page <= 1" @click="page--">
                上一页食品
              </button>
              <span>第 {{ page }} / {{ pageCount }} 页</span>
              <button class="btn small-btn" :disabled="page >= pageCount" @click="page++">
                下一页食品
              </button>
            </div>
          </template>
        </div>
      </div>
      <div class="food-combination">
        <div class="row between">
          <h3>今日实际食品组合</h3>
          <span class="pill">{{ rows.length }} 项</span>
        </div>
        <p v-if="!rows.length" class="empty-state">
          从食品目录或常见份量添加食品，再调整实际吃下的数量。
        </p>
        <article v-for="row in rows" :key="row.id" class="combination-row">
          <div class="row between">
            <strong>{{ row.food.name }}</strong
            ><button
              class="text-link"
              :aria-label="`移除${row.food.name}`"
              @click="rows = rows.filter((r) => r.id !== row.id)"
            >
              移除
            </button>
          </div>
          <div class="portion-inputs">
            <label
              >食用数量<input
                v-model.number="row.quantity"
                type="number"
                min="0.01"
                max="5000"
                step="any"
            /></label>
            <label
              >计量单位<select v-model="row.unit" @change="switchUnit(row)">
                <option value="g">克</option>
                <option v-if="row.food.unit" :value="row.food.unit">
                  {{ row.food.unit }}（参考）
                </option>
              </select></label
            >
            <label v-if="row.unit !== 'g'"
              >每{{ row.unit }}克重<input
                v-model.number="row.unitGrams"
                type="number"
                min="0.01"
                max="5000"
                step="any"
            /></label>
          </div>
          <p v-if="rowGrams(row) !== null">
            {{ fmt(rowGrams(row), 2) }}g × {{ fmt(row.food.kcal / 100, 3) }} kcal/g ≈
            <strong>{{ fmt((row.food.kcal * rowGrams(row)) / 100) }} kcal</strong>
          </p>
          <p v-if="row.food.unknownMacros?.length" class="tiny">
            部分营养值未提供，仅已知数值参与合计。
          </p>
          <p v-else class="alert" role="alert">请输入正数，单项总重量不能超过5000g。</p>
        </article>
        <div class="combination-total" aria-live="polite">
          <span>本次组合热量估算</span><strong>{{ fmt(total.kcal) }} <small>kcal</small></strong>
          <p>
            蛋白 {{ fmt(total.protein) }}g · 碳水 {{ fmt(total.carb) }}g · 脂肪
            {{ fmt(total.fat) }}g
          </p>
          <p v-if="rows.some((r) => r.food.unknownMacros?.length)">
            营养合计不含未提供项，未提供不代表零含量。
          </p>
          <p v-if="invalid" role="alert">有食品份量无效，请修正后再确认。</p>
        </div>
        <button class="btn primary full" :disabled="!rows.length || invalid" @click="confirm">
          确认组合并计入今日
        </button>
        <button v-if="rows.length" class="btn full" @click="rows = []">清空本次组合</button>
        <p class="tiny">
          选择的是实际吃下的食品；热量仍是参考估算。称重不含骨、皮等不可食部分。烹调用油、酱料、饮料请分别加入，混合菜肴不要重复计算原料。
        </p>
      </div>
    </div>
    <details class="food-source">
      <summary>食品数据与份量说明</summary>
      <p>
        来源：<a :href="foodSource.url" target="_blank" rel="noopener noreferrer">{{
          foodSource.source
        }}</a
        >；{{ foodSource.license }}。获取日期
        {{
          foodSource.retrievedAt
        }}，名称已转简体并补充常用别名。营养值按每100g可食部分换算，生熟状态见每项说明。
      </p>
      <p>
        碗、个、片、杯的克重是本应用提供的可修改参考值，并非统一标准。熟面条按干面煮后增重至2.5倍估算；汤、浇头、油和酱料另计。不同品牌、配方及含水量会影响实际热量。
      </p>
    </details>
  </section>
</template>

<style scoped>
.calorie-panel {
  margin-bottom: 24px;
}
.calorie-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 18px 0 26px;
}
.calorie-stats > div {
  padding: 18px;
  border-radius: 14px;
  background: #eff4e9;
}
.calorie-stats span,
.calorie-stats strong {
  display: block;
}
.calorie-stats span {
  font-size: 12px;
  color: #586850;
  margin-bottom: 8px;
}
.calorie-stats strong {
  font-size: 26px;
  color: var(--dark);
}
small {
  font-size: 12px;
  font-weight: 400;
}
.calorie-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr);
  gap: 24px;
  align-items: start;
}
.food-browser,
.food-combination {
  min-width: 0;
}
.portion-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 14px 0 20px;
}
.portion-preset {
  padding: 14px 12px;
  border: 1px solid #dce6d3;
  border-radius: 12px;
  text-align: left;
  background: #f8faf5;
}
.portion-preset span,
.portion-preset small {
  display: block;
  margin-top: 7px;
  font-size: 11px;
}
.portion-preset small {
  color: var(--green);
}
.food-filters {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
  margin-bottom: 10px;
}
.food-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.food-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow-wrap: anywhere;
}
.food-card > strong {
  font-size: 20px;
  color: var(--green);
}
.food-card details {
  font-size: 11px;
  margin-bottom: 6px;
}
.food-card .btn {
  margin-top: auto;
}
.food-pagination {
  margin-top: 16px;
  font-size: 12px;
}
.food-combination {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fafbf8;
}
.combination-row {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
.combination-row > .row {
  align-items: flex-start;
  gap: 10px;
}
.combination-row strong {
  overflow-wrap: anywhere;
}
.combination-row .text-link {
  flex-shrink: 0;
}
.portion-inputs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0 8px;
}
.portion-inputs label {
  min-width: 0;
}
.portion-inputs input,
.portion-inputs select {
  width: 100%;
}
.combination-total {
  margin: 18px 0;
}
.combination-total > span {
  font-size: 12px;
}
.combination-total > strong {
  display: block;
  font-size: 30px;
  color: var(--green);
  margin: 6px 0;
}
.food-combination > .btn {
  margin-bottom: 10px;
}
.food-source {
  font-size: 12px;
  margin-top: 20px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.food-source a {
  text-decoration: underline;
}
@media (max-width: 1200px) {
  .calorie-workspace {
    grid-template-columns: 1fr;
  }
  .food-browser {
    display: contents;
  }
  .portion-scenarios {
    order: 0;
  }
  .food-combination {
    order: 1;
  }
  .food-directory {
    order: 2;
  }
}
@media (max-width: 600px) {
  .calorie-stats {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .calorie-stats > div {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .calorie-stats span {
    margin: 0;
  }
  .calorie-stats strong {
    font-size: 22px;
  }
  .portion-presets,
  .food-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .food-filters {
    grid-template-columns: 1fr;
  }
  .food-card {
    padding: 12px;
  }
}
</style>
