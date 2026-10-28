import { reactive, computed } from 'vue'
import { api, demoMode } from './api'
import { catalog } from './badges'
let initial = null
try {
  if (demoMode) initial = JSON.parse(localStorage.getItem('tm_demo_featured'))
} catch {}
export const badgeProfile = reactive({ featuredId: initial })
export const featuredBadge = computed(
  () => catalog.find((b) => b.id === badgeProfile.featuredId) || null,
)
let generation = 0
export function resetBadgeProfile() {
  generation++
  if (!demoMode) badgeProfile.featuredId = null
}
export async function refreshBadgeProfile() {
  if (demoMode) return
  const version = generation
  const data = await api('/badges')
  if (version === generation) badgeProfile.featuredId = data.featured_id
}
export async function wearBadge(id) {
  if (demoMode) {
    localStorage.setItem('tm_demo_featured', JSON.stringify(id))
    badgeProfile.featuredId = id
    return
  }
  const version = ++generation
  const data = await api('/badges/featured', { badge_id: id }, 'PUT')
  if (version === generation) badgeProfile.featuredId = data.featured_id
}
