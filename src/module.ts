import { fileURLToPath } from "node:url";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  defineNuxtModule,
  addBuildPlugin,
  addImportsDir,
  addComponentsDir,
  useLogger,
} from "@nuxt/kit";
import { defu } from "defu";
import { pascalCase } from "scule";

// Module options TypeScript interface definition
export interface ModuleOptions {
  /**
   * The folders inside <srcDir> that should be treated as FSD layers.
   * The first and last layers correspond to "app" and "shared", and hence have no slices.
   *
   * Defaults to `["app", "pages", "widgets", "features", "entities", "shared"]`.
   */
  layers: string[];
  /**
   * The names of the segments to be scanned for auto-imports.
   *
   * Defaults to `["ui", "model", "api", "lib", "config"]`.
   */
  segments: string[]; // TODO: same as layers
  /**
   * The prefix to add to the layer name to create the alias (for example, `@` or `~`).
   * Note that a prefix of `#` will cause clashes with app and shared (in Nuxt 4 compatibility mode).
   *
   * Defaults to `''`.
   */
  aliasPrefix: string;
  // TODO: option for whether to prefix components (auto import) with layer name or not
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-fsd",
    configKey: "fsd", // Or should it be `featureSliced`?
  },
  defaults: {
    layers: ["app", "pages", "widgets", "features", "entities", "shared"],
    segments: ["ui", "model", "api", "lib", "config"],
    aliasPrefix: "",
  },
  async setup(options, nuxt) {
    const timeStart = Date.now();

    const logger = useLogger("nuxt-fsd");

    const { aliasPrefix, layers, segments } = options;

    // Validate user-passed options

    if (layers.length < 2) {
      logger.error("Must define at least 2 layers");
    }
    if (segments.length < 1) {
      logger.error("Must define at least 1 segment");
    }

    const folderNameIllegal = /[/\\?%*:|"<>]/;
    if (
      layers.some((layer) => folderNameIllegal.test(layer)) ||
      segments.some((segment) => folderNameIllegal.test(segment))
    ) {
      logger.error(
        'Illegal layer or segment name used. Must not have any of `/\\?%*:|"<>`'
      );
    }

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

    // "app" and "shared" do not have slices
    const appLayer = layers.at(0)!;
    const sharedLayer = layers.at(-1)!;
    const middleLayers = layers.slice(1, -1);

    // https://feature-sliced.design/docs/guides/tech/with-nuxtjs
    nuxt.options.dir = defu(nuxt.options.dir, {
      pages: join(srcDir, appLayer, "routes"),
      layouts: join(srcDir, appLayer, "layouts"),
    });

    // Add segments to auto-imports dirs

    if (autoImport !== false) {
      // Register auto-imports from App layer
      addImportsDir(segments.map((segment) => join(srcDir, appLayer, segment)));
      segments.forEach((segment) => {
        const path = join(srcDir, appLayer, segment);
        if (existsSync(path)) {
          addComponentsDir({
            path,
            prefix: pascalCase(appLayer),
          });
        }
      });

      // Register auto-imports from Shared layer
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

      // Register auto-imports from other layers
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
