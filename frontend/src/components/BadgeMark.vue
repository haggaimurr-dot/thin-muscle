<script setup>
import Icon from './Icon.vue'
defineProps({ badge: Object, locked: Boolean, small: Boolean })
</script>
<template>
  <span class="badge-mark" :class="[badge.tier, { locked, small }]"
    ><span class="badge-mark-inner"><Icon :name="badge.icon" :size="small ? 19 : 30" /></span><i></i
    ><i></i
  ></span>
</template>
