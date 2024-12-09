<script setup lang="ts">
defineProps<Author>();
</script>

<template>
  <div>
    <p>Name: {{ name }}</p>
    <p>Birthday: {{ birthDate }}</p>
  </div>
</template>
