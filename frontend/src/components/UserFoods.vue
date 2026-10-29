<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { api } from '../api'
import { notify } from '../store'
import { asCatalogFood } from '../user-foods'
import Modal from './Modal.vue'
import UserFoodImage from './UserFoodImage.vue'

const props = defineProps({ query: String, category: String })
const emit = defineEmits(['select'])
const scope = ref('catalog'),
  page = ref(1),
  result = ref({ items: [], total: 0, page_size: 18 })
const loading = ref(false),
  busy = ref(false),
  error = ref(''),
  editor = ref(false),
  consent = ref(false)
const form = ref({}),
  file = ref(null),
  preview = ref(''),
  aiReady = ref(false)
let request,
  debounce,
  generation = 0
async function load() {
  const epoch = ++generation
  request?.abort()
  request = new AbortController()
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      scope: scope.value,
      page: page.value,
      q: props.query || '',
      category: props.category || '',
    })
    const data = await api('/foods?' + params, undefined, 'GET', request.signal)
    if (epoch === generation) result.value = data
  } catch (e) {
    if (e.name !== 'AbortError' && epoch === generation) error.value = e.message
  } finally {
    if (epoch === generation) loading.value = false
  }
}
watch(
  () => [props.query, props.category, scope.value],
  () => {
    page.value = 1
    result.value = { items: [], total: 0, page_size: 18 }
    clearTimeout(debounce)
    request?.abort()
    generation++
    debounce = setTimeout(load, 200)
  },
  { immediate: true },
)
watch(page, load)
function revoke() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
}
async function open(food = null) {
  if (busy.value) return
  revoke()
  file.value = null
  consent.value = false
  error.value = ''
  form.value = food
    ? { ...food }
    : {
        name: '',
        food_kind: '',
        energy: '',
        energy_unit: 'kcal',
        basis_grams: 100,
        protein: null,
        carb: null,
        fat: null,
        note: '',
        visibility: 'private',
        status: 'listed',
      }
  form.value.remove_image = false
  editor.value = true
  try {
    aiReady.value = (await api('/auth/capabilities')).food_recognition
  } catch {
    aiReady.value = false
  }
}
function pick(event) {
  const picture = event.target.files[0]
  if (!picture) return
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(picture.type) ||
    picture.size > 8 * 1024 * 1024
  ) {
    error.value = '请选择8MB以内的JPEG、PNG或WebP图片'
    event.target.value = ''
    return
  }
  revoke()
  file.value = picture
  preview.value = URL.createObjectURL(picture)
  form.value.remove_image = false
}
function removePicture() {
  revoke()
  file.value = null
  form.value.remove_image = true
}
async function save() {
  if (busy.value) return
  const f = form.value
  const kcal100 =
    ((Number(f.energy) / (f.energy_unit === 'kJ' ? 4.184 : 1)) * 100) / Number(f.basis_grams)
  if (
    !f.name.trim() ||
    !f.food_kind.trim() ||
    f.energy === '' ||
    !Number.isFinite(kcal100) ||
    kcal100 < 0 ||
    kcal100 > 1000 ||
    Number(f.basis_grams) <= 0 ||
    Number(f.basis_grams) > 5000
  ) {
    error.value = '请填写名称、食品种类和有效热量与克重（每100g热量≤1000 kcal）'
    return
  }
  const data = Object.fromEntries(
    [
      'name',
      'food_kind',
      'energy',
      'energy_unit',
      'basis_grams',
      'note',
      'visibility',
      'status',
      'remove_image',
    ].map((key) => [key, f[key]]),
  )
  for (const key of ['protein', 'carb', 'fat'])
    data[key] = f[key] === '' || f[key] == null ? null : Number(f[key])
  if (f.id) data.revision = f.revision
  const body = new FormData()
  body.append('payload', JSON.stringify(data))
  body.append('consent', String(consent.value))
  if (file.value) body.append('file', file.value)
  busy.value = true
  error.value = ''
  try {
    const saved = await api('/foods' + (f.id ? '/' + f.id : ''), body, f.id ? 'PUT' : 'POST')
    editor.value = false
    revoke()
    scope.value = 'mine'
    page.value = 1
    await load()
    notify(
      saved.classification_status === 'ready'
        ? '食品已保存并完成AI分组'
        : saved.classification_note,
    )
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function act(food, action) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (action === 'classify') {
      if (!consent.value) {
        error.value = '请先勾选下方的AI分类授权'
        return
      }
      const saved = await api(`/foods/${food.id}/classify`, {
        revision: food.revision,
        consent: true,
      })
      notify(
        saved.classification_status === 'ready'
          ? 'AI分组完成，可上架食品'
          : saved.classification_note,
      )
    } else {
      await api(
        `/foods/${food.id}`,
        {
          revision: food.revision,
          visibility:
            action === 'visibility'
              ? food.visibility === 'private'
                ? 'public'
                : 'private'
              : food.visibility,
          status:
            action === 'status' ? (food.status === 'listed' ? 'draft' : 'listed') : food.status,
        },
        'PATCH',
      )
      notify('食品展示状态已更新')
    }
    await load()
  } catch (e) {
    error.value = e.message
    if (e.status === 409) await load()
  } finally {
    busy.value = false
  }
}
function close() {
  if (!busy.value) {
    editor.value = false
    revoke()
  }
}
onBeforeUnmount(() => {
  clearTimeout(debounce)
  request?.abort()
  revoke()
})
</script>

<template>
  <section class="user-foods" aria-label="用户自建食品">
    <div class="row between wrap">
      <div class="segmented">
        <button :class="{ active: scope === 'catalog' }" @click="scope = 'catalog'">
          已上架食品
        </button>
        <button :class="{ active: scope === 'mine' }" @click="scope = 'mine'">我的上传</button>
      </div>
      <button class="btn primary" :disabled="busy" @click="open()">上传自建食品</button>
    </div>
    <p>
      已上架目录包含公开食品及你自己的私有食品；草稿和下架食品在「我的上传」管理。热量由上传者提供，AI辅助分组。
    </p>
    <p v-if="loading" role="status">正在加载食品…</p>
    <p v-if="error && !editor" class="alert" role="alert">
      {{ error }} <button class="text-link" @click="load">重新加载</button>
    </p>
    <p v-if="!loading && !error && !result.items.length" class="empty-state">
      暂无匹配的自建食品，可调整分类和搜索词，或上传一项食品。
    </p>
    <label
      v-if="scope === 'mine' && result.items.some((f) => f.classification_status !== 'ready')"
      class="ai-consent"
      ><input
        v-model="consent"
        type="checkbox"
      />同意将食品名称、种类、热量、说明及图片发送给AI分类服务，用于重试分组</label
    >
    <div class="user-food-grid" :aria-busy="loading">
      <article v-for="food in result.items" :key="food.id" class="user-food-card">
        <UserFoodImage
          v-if="food.has_image"
          :id="food.id"
          :revision="food.revision"
          :name="food.name"
        />
        <div class="row wrap">
          <span class="pill">{{ food.visibility === 'private' ? '私有' : '公开' }}</span
          ><span v-if="food.is_owner" class="pill">{{
            food.status === 'listed' ? '已上架' : '草稿 / 已下架'
          }}</span>
        </div>
        <h3>{{ food.name }}</h3>
        <p>{{ food.food_kind }} · {{ food.category || '待AI分类' }}</p>
        <strong>{{ Number((food.kcal / 100).toFixed(3)) }} kcal / 克</strong>
        <p>{{ Number(food.kcal.toFixed(1)) }} kcal / 100g</p>
        <p>{{ food.energy }} {{ food.energy_unit }} / {{ food.basis_grams }}g</p>
        <details>
          <summary>食品信息</summary>
          <p>{{ food.note || '暂无补充说明' }}</p>
          <p>{{ food.classification_note }}</p>
          <p>
            每100g蛋白 {{ food.protein ?? '未提供' }} · 碳水 {{ food.carb ?? '未提供' }} · 脂肪
            {{ food.fat ?? '未提供' }}（g）
          </p>
        </details>
        <button
          v-if="food.status === 'listed'"
          class="btn"
          :disabled="loading"
          @click="emit('select', asCatalogFood(food))"
        >
          ＋ 加入组合
        </button>
        <div v-if="food.is_owner" class="owner-actions">
          <button class="btn small-btn" :disabled="busy" @click="open(food)">编辑食品</button>
          <button
            class="btn small-btn"
            :disabled="busy || (food.status !== 'listed' && food.classification_status !== 'ready')"
            @click="act(food, 'status')"
          >
            {{ food.status === 'listed' ? '下架食品' : '上架食品' }}
          </button>
          <button class="btn small-btn" :disabled="busy" @click="act(food, 'visibility')">
            {{ food.visibility === 'private' ? '设为公开' : '设为私有' }}
          </button>
          <button
            v-if="food.classification_status !== 'ready'"
            class="btn small-btn"
            :disabled="busy"
            @click="act(food, 'classify')"
          >
            重试AI分组
          </button>
        </div>
      </article>
    </div>
    <div class="row between pagination">
      <button class="btn small-btn" :disabled="page <= 1 || loading" @click="page--">
        上一页自建食品</button
      ><span>{{ result.total }}项 · 第{{ page }}页</span
      ><button
        class="btn small-btn"
        :disabled="page * result.page_size >= result.total || loading"
        @click="page++"
      >
        下一页自建食品
      </button>
    </div>
    <Modal v-if="editor" :title="form.id ? '编辑自建食品' : '上传自建食品'" @close="close">
      <form class="form-stack" @submit.prevent="save">
        <fieldset :disabled="busy" class="food-fields">
          <label
            >食品名称（必填）<input
              v-model="form.name"
              required
              maxlength="128"
              placeholder="例如 自制燕麦饼干"
          /></label>
          <label
            >食品种类（必填）<input
              v-model="form.food_kind"
              required
              maxlength="64"
              placeholder="例如 零食、面包、水果、正餐、其他可食物"
          /></label>
          <div class="two-col">
            <label
              >热量数值（必填）<input
                v-model.number="form.energy"
                type="number"
                min="0"
                max="50000"
                step="any"
                required /></label
            ><label
              >热量单位<select v-model="form.energy_unit" aria-label="热量单位">
                <option value="kcal">kcal（千卡）</option>
                <option value="kJ">kJ（千焦）</option>
              </select></label
            >
          </div>
          <label
            >上述热量对应克重（必填）<input
              v-model.number="form.basis_grams"
              type="number"
              min="0.01"
              max="5000"
              step="any"
              required
          /></label>
          <p>例如每袋50g共200 kcal，填写200和50g。系统自动换算每克热量；饮料请填克重。</p>
          <label
            >食品或热量信息图片（选填）<input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="pick"
          /></label>
          <img v-if="preview" :src="preview" alt="待上传食品图片预览" class="food-preview" />
          <UserFoodImage
            v-else-if="form.has_image && !form.remove_image"
            :id="form.id"
            :revision="form.revision"
            :name="form.name"
          />
          <button
            v-if="preview || (form.has_image && !form.remove_image)"
            type="button"
            class="btn"
            @click="removePicture"
          >
            移除食品图片
          </button>
          <label
            >补充说明<textarea
              v-model="form.note"
              maxlength="1000"
              rows="2"
              placeholder="品牌、原料、生熟状态或热量来源"
            />
          </label>
          <details>
            <summary>补充每100g营养值（选填，留空表示未知）</summary>
            <div class="two-col">
              <label
                v-for="[key, label] in [
                  ['protein', '蛋白质'],
                  ['carb', '碳水'],
                  ['fat', '脂肪'],
                ]"
                :key="key"
                >{{ label }}（g / 100g）<input
                  v-model="form[key]"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
              /></label>
            </div>
          </details>
          <label
            >可见范围<select v-model="form.visibility" aria-label="可见范围">
              <option value="private">私有，仅自己可见</option>
              <option value="public">公开，上架后展示给其他用户</option>
            </select></label
          >
          <label
            ><input
              v-model="form.status"
              type="checkbox"
              true-value="listed"
              false-value="draft"
            />AI分组成功后上架，可随时下架</label
          >
          <label class="ai-consent"
            ><input
              v-model="consent"
              type="checkbox"
            />同意将本次食品名称、种类、热量、说明及图片发送给AI服务商智能分组</label
          >
          <p v-if="!aiReady">AI分类服务尚未配置。可以先保存草稿，服务开通后重试分组并上架。</p>
          <p>
            食品内容修改后会重新分组；未授权、分类失败或等待分类时保存为草稿。图片随可见范围和上架状态一起控制。
          </p>
        </fieldset>
        <p v-if="error" class="alert" role="alert">{{ error }}</p>
        <button class="btn primary full" :disabled="busy" type="submit">
          {{ busy ? '正在保存并分组…' : '保存食品并智能分组' }}
        </button>
      </form>
    </Modal>
  </section>
</template>

<style scoped>
.user-foods {
  margin-top: 14px;
}
.user-food-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.user-food-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.user-food-card > strong {
  color: var(--green);
  font-size: 19px;
}
.user-food-card details {
  font-size: 12px;
}
.owner-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}
.pagination {
  margin-top: 16px;
  font-size: 12px;
}
.food-fields {
  border: 0;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;
  min-width: 0;
}
.food-preview {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
}
.ai-consent {
  font-size: 12px;
  line-height: 1.8;
}
@media (max-width: 600px) {
  .user-food-grid {
    grid-template-columns: 1fr;
  }
}
</style>
