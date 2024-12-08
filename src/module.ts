import { fileURLToPath } from "node:url";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  defineNuxtModule,
  addBuildPlugin,
  addImportsDir,
  addComponentsDir,
} from "@nuxt/kit";
import { defu } from "defu";
import { pascalCase } from "scule";

// Module options TypeScript interface definition
export interface ModuleOptions {
  /**
   * Defaults to `["app", "pages", "widgets", "features", "entities", "shared"]`
   */
  layers: string[]; // TODO: should it be an object mapping layer to its name? Maybe allow both
  /**
   * The prefix to add to the layer name to create the alias (for example, `@` or `~`).
   * Note that a prefix of `#` will cause clashes with app and shared (in Nuxt 4 compatibility mode).
   * Defaults to `''`.
   */
  aliasPrefix: string;
  /**
   *
   */
  segments: string[]; // TODO: same as layers
  // TODO: option for prefixing components with layer
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-fsd",
    configKey: "fsd", // Or should it be `featureSliced`?
  },
  // Default configuration options of the Nuxt module
  defaults: {
    layers: ["app", "pages", "widgets", "features", "entities", "shared"],
    segments: ["ui", "model", "api", "lib", "config"],
    aliasPrefix: "",
  },
  async setup(options, nuxt) {
    const timeStart = Date.now();

    const { aliasPrefix, layers, segments } = options;
    const {
      srcDir,
      imports: { autoImport },
    } = nuxt.options;

    // Define import aliases

    nuxt.options.alias = defu(
      nuxt.options.alias,
      ...layers.map((layer) => ({
        [`${aliasPrefix}${layer}`]: fileURLToPath(
          new URL(join(srcDir, layer), import.meta.url)
        ),
      }))
    );

    // Add segments to auto-imports dirs

    if (autoImport !== false) {
      // "app" and "shared" do not have slices
      const appLayer = layers.at(0);
      const sharedLayer = layers.at(-1);
      const middleLayers = layers.slice(1, -1);

      if (appLayer) {
        addImportsDir(
          segments.map((segment) => join(srcDir, appLayer, segment))
        );
        segments.forEach((segment) => {
          const path = join(srcDir, appLayer, segment);
          if (existsSync(path)) {
            addComponentsDir({
              path,
              prefix: pascalCase(appLayer),
            });
          }
        });
      }

      if (sharedLayer) {
        addImportsDir(
          segments.map((segment) => join(srcDir, sharedLayer, segment))
        );
        segments.forEach((segment) => {
          const path = join(srcDir, sharedLayer, segment);
          if (existsSync(path)) {
            addComponentsDir({
              path,
              prefix: pascalCase(sharedLayer),
            });
          }
        });
      }

      // Glob is not yet supported: https://github.com/unjs/jiti/issues/339 (from https://github.com/nuxt/nuxt/discussions/29795)
      const contents = middleLayers.flatMap((layer) => {
        const layerPath = join(srcDir, layer);
        if (!existsSync(layerPath)) {
          return [];
        }
        const slices = readdirSync(layerPath, {
          withFileTypes: true,
          recursive: true, // Slices can be grouped
        });
        return slices
          .filter((slice) => slice.isDirectory())
          .flatMap((slice) =>
            segments.map((segment) => ({ layer, slice: slice.name, segment }))
          );
      });

      addImportsDir(
        contents.map(({ layer, slice, segment }) =>
          join(srcDir, layer, slice, segment)
        )
      );
      contents.forEach((file) => {
        const path = join(srcDir, file.layer, file.slice, file.segment);
        if (existsSync(path)) {
          addComponentsDir({
            path,
            prefix: pascalCase(`${file.layer}-${file.slice}`),
          });
        }
      });
    }

    // TODO: 3. Add build plugin impound

    const timeEnd = Date.now();
    return {
      timings: {
        setup: timeEnd - timeStart,
      },
    };
  },
});
