import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-fsd",
    configKey: "fsd", // Or should it be `featureSliced`?
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup(_options, _nuxt) {
  },
})
