# Nuxt Feature-Sliced Design

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt 3 module for [Feature-Sliced Design](https://feature-sliced.design/) support.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/aabounegm/nuxt-fsd?file=playground%2Fapp.vue) -->

## Features

Redefines `layouts` directory to be `<srcDir>/app/layouts` segment and `pages` to `<srcDir>/app/routes` segment

- Defines path aliases for all FSD layers (compatible with Nuxt 4 "app" directory structure)
- Registers auto-imports for code and components in all your slices (respects `imports.autoImport` config)
- Prevents cross-imports from higher layers

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add nuxt-fsd
```

That's it! You can now use Feature-Sliced Design in your Nuxt app ✨

## Configuration

### Layers and segments

By default, the module uses the following layers and segments:

- Layers: `app`, `pages`, `widgets`, `features`, `entities`, and `shared`
- Segments: `ui`, `model`, `api`, `lib`, and `config`

They are both configurable using the `layers` and `segments` options (respectively) in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  // ...
  modules: ["nuxt-fsd"],
  fsd: {
    // An example changing the layers and segments
    layers: ["app", "layouts", "screens", "features", "entities", "common"],
    segments: ["components", "composables", "model", "api"],
  },
});
```

All layer names are relative to `srcDir`, which defaults to the root directory in Nuxt 3, and to the `app` directory in Nuxt 4 (compatibility mode).

The first and last layers always correspond to `app` and `shared` (respectively) from the FSD standard, in that they do not have slices.

### Import path aliases

The module automatically defines path aliases for all layers. You can use them in your code like so:

```ts
import { useUser } from "features/user";
```

You can optionally add a prefix to the aliases using the `aliasPrefix` option:

```ts
export default defineNuxtConfig({
  // ...
  modules: ["nuxt-fsd"],
  fsd: {
    aliasPrefix: '@',
  },
});
```

and then use the aliases like so:

```ts
import { useUser } from "@features/user";
```

### Auto-imported components

Auto-imported components are prefixed by the name of the layer and slice they belong to. App and Shared layers do not have slice. For example, `shared/ui/button.vue` can be auto-imported as `<SharedButton />`, and `features/user/ui/avatar.vue` can be auto-imported as `<FeaturesUserAvatar />`.

There is currently no way to configure the prefix for auto-imported components. Please open an issue if you need this feature.

### Cross-import protection

If the `preventCrossImports` option is set to `true` (the default), the module will prevent cross-imports between layers. This means that you cannot import a slice from a higher layer in a lower layer. For example, you cannot import a slice from the `features` layer in the `entities` layer. You also cannot import from other slices in the same layer.

The module also respects the explicit [public API for cross-imports](https://feature-sliced.design/docs/reference/public-api#public-api-for-cross-imports)

If you need more tailored configuration for this option (e.g. enable it only in dev or only print a warning), please open an issue.

## Known issues and limitations

- Auto-imports do not respect cross-import protection rules. It is advisable to keep imports explicit as much as possible.
- The dev server restarts when adding new slices/segments to register auto-imports and cross-import protection in them. With better coding from my side, this should not be necessary, but I will probably only handle it if it becomes problematic.

## Contribution

<details>
  <summary>Local development</summary>

  ```bash
  # Install dependencies
  pnpm install

  # Generate type stubs
  pnpm run dev:prepare

  # Develop with the playground
  pnpm run dev

  # Build the playground
  pnpm run dev:build

  # Run ESLint
  pnpm run lint

  # Release new version
  pnpm run release
  ```

</details>


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-fsd/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-fsd

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-fsd.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-fsd

[license-src]: https://img.shields.io/npm/l/nuxt-fsd.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-fsd

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
