<script setup lang="ts">
const cart = useCart();
</script>

<template>
  <SharedMyButton @click="cart.addItem()">Add to cart</SharedMyButton>
</template>
