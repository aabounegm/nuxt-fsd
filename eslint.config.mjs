// @ts-check
import { createConfigForNuxt } from "@nuxt/eslint-config/flat";

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
    // Disable formatting rules (I use Prettier)
    stylistic: false,
  },
  dirs: {
    src: ["./playground"],
    pages: ["./playground/app/app/routes"],
  },
})
  .append
  // your custom flat config here...
  ();
