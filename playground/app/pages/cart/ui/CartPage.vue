<script setup lang="ts">
const { items } = useCart();
</script>

<template>
  <div>
    <EntitiesBookSummary v-for="(_book, idx) in items" :key="idx" />
  </div>
</template>
