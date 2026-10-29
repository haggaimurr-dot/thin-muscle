<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Icon from './Icon.vue'
defineProps({ title: String })
const emit = defineEmits(['close'])
const dialog = ref()
let previous
let previousOverflow
const keydown = (e) => {
  if ([...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].at(-1) !== dialog.value)
    return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Tab') {
    const items = [
      ...dialog.value.querySelectorAll('button,input,select,textarea,a[href],[tabindex]'),
    ].filter(
      (item) =>
        !item.disabled &&
        item.tabIndex >= 0 &&
        item.getClientRects().length &&
        !item.closest('[hidden],[inert]'),
    )
    if (!items.length) return
    if (
      e.shiftKey &&
      (document.activeElement === items[0] ||
        document.activeElement === dialog.value ||
        !dialog.value.contains(document.activeElement))
    ) {
      e.preventDefault()
      items.at(-1).focus()
    } else if (
      !e.shiftKey &&
      (document.activeElement === items.at(-1) || !dialog.value.contains(document.activeElement))
    ) {
      e.preventDefault()
      items[0].focus()
    }
  }
}
onMounted(() => {
  previous = document.activeElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value.focus()
  document.addEventListener('keydown', keydown)
})
onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', keydown)
  if (previous?.isConnected) previous.focus()
})
</script>
<template>
  <Teleport to="body"
    ><div class="modal-backdrop" @click.self="emit('close')">
      <section
        ref="dialog"
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <div class="section-heading">
          <h2>{{ title }}</h2>
          <button class="icon-btn" aria-label="关闭" @click="emit('close')">
            <Icon name="close" />
          </button>
        </div>
        <slot />
      </section></div
  ></Teleport>
</template>
