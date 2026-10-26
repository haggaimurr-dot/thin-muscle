<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Icon from './Icon.vue'
defineProps({ title: String })
const emit = defineEmits(['close'])
const dialog = ref()
let previous
const keydown = (e) => {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Tab') {
    const items = [
      ...dialog.value.querySelectorAll('button:not(:disabled),input,select,textarea,a[href]'),
    ]
    if (!items.length) return
    if (e.shiftKey && document.activeElement === items[0]) {
      e.preventDefault()
      items.at(-1).focus()
    } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
      e.preventDefault()
      items[0].focus()
    }
  }
}
onMounted(() => {
  previous = document.activeElement
  document.body.style.overflow = 'hidden'
  dialog.value.focus()
  document.addEventListener('keydown', keydown)
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', keydown)
  previous?.focus()
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
