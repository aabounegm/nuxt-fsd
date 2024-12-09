<script setup lang="ts">
const cart = useCart();
</script>

<template>
  <SharedButton @click="cart.addItem()">Add to cart</SharedButton>
</template>
