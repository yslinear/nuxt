<script setup lang="ts">
const state = ref(1)
</script>

<template>
  <div>
    Bundle me {{ state }}
    <button @click="state++">
      Hey!
    </button>
  </div>
</template>
