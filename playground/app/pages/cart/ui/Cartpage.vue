<script setup lang="ts">
const { items } = useCart();
</script>

<template>
  <div>
    <EntitiesBookSummary v-for="book in items" />
  </div>
</template>
