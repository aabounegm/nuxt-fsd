import { fileURLToPath } from "node:url";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  defineNuxtModule,
  addBuildPlugin,
  addImportsDir,
  addComponentsDir,
  useLogger,
  loadNuxtConfig,
} from "@nuxt/kit";
import { defu } from "defu";
import { pascalCase } from "scule";
import { ImpoundPlugin, type ImpoundOptions } from "impound";
import escapeRE from "escape-string-regexp";

// Module options TypeScript interface definition
export interface ModuleOptions {
  /**
   * The folders inside <srcDir> that should be treated as FSD layers.
   * The first and last layers correspond to "app" and "shared", and hence have no slices.
   * @see https://feature-sliced.design/docs/reference/layers
   *
   * Defaults to `["app", "pages", "widgets", "features", "entities", "shared"]`.
   */
  layers: string[];
  /**
   * The names of the segments to be scanned for auto-imports.
   * @see https://feature-sliced.design/docs/reference/slices-segments#segments
   *
   * Defaults to `["ui", "model", "api", "lib", "config"]`.
   */
  segments: string[];
  /**
   * The prefix to add to the layer name to create the alias (for example, `@` or `~`).
   * Note that a prefix of `#` will cause clashes with app and shared (in Nuxt 4 compatibility mode).
   *
   * Defaults to `''`.
   */
  aliasPrefix: string;
  // TODO: option for whether to prefix components (auto import) with layer name or not
  /**
   * Prevent imports from layers above or from other slices in the same layer.
   * Respects `@x`-notation for cross-imports public API.
   * @see https://feature-sliced.design/docs/reference/public-api#public-api-for-cross-imports
   *
   * Defaults to `true`.
   */
  preventCrossImports?: boolean;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-fsd",
    configKey: "fsd", // Or should it be `featureSliced`?
  },
  defaults: {
    layers: ["app", "pages", "widgets", "features", "entities", "shared"],
    segments: ["ui", "model", "api", "lib", "config"], // TODO: should I add "composables" here?
    aliasPrefix: "",
    preventCrossImports: true,
  },
  async setup(options, nuxt) {
    const timeStart = Date.now();

    const logger = useLogger("nuxt-fsd");

    const { aliasPrefix, layers, segments, preventCrossImports } = options;

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
    // nuxt.config is already filled with built-in default values
    const nuxtOptions = await loadNuxtConfig({
      defaults: {
        dir: {
          pages: join(srcDir, appLayer, "routes"),
          layouts: join(srcDir, appLayer, "layouts"),
        },
      },
    });

    nuxt.options.dir = nuxtOptions.dir;

    // Add segments to auto-imports dirs

    // Glob is not yet supported: https://github.com/unjs/jiti/issues/339 (from https://github.com/nuxt/nuxt/discussions/29795)
    const slices = middleLayers.flatMap((layer) => {
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
        .map((slice) => ({ layer, slice: slice.name }));
    });
    const segmentsPaths = slices.flatMap(({ layer, slice }) =>
      segments.map((segment) => ({ layer, slice, segment }))
    );

    // TODO: remove "composables" and "utils" from `nuxt.options.imports.dirs`
    // and "components" from `nuxt.options.components.dirs`

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

      addImportsDir(
        segmentsPaths.map(({ layer, slice, segment }) =>
          join(srcDir, layer, slice, segment)
        )
      );
      segmentsPaths.forEach((file) => {
        const path = join(srcDir, file.layer, file.slice, file.segment);
        if (existsSync(path)) {
          addComponentsDir({
            path,
            prefix: pascalCase(`${file.layer}-${file.slice}`),
          });
        }
      });
    }

    if (preventCrossImports) {
      const layersIdxs: Record<string, number> = Object.fromEntries(
        layers.map((layer, idx) => [layer, idx])
      );

      slices.forEach(({ layer, slice }) => {
        const layerIdx = layersIdxs[layer];
        const previousLayers = layers.slice(0, layerIdx);
        if (previousLayers.length === 0) {
          return;
        }

        // For all modules in the current slice, prevent imports from other layers or other slices in the same layer
        const include: ImpoundOptions["include"] = [
          join(srcDir, layer, slice, "**", "*"),
        ];
        const patterns: ImpoundOptions["patterns"] = previousLayers.map(
          (previousLayer) => [
            new RegExp(
              String.raw`${escapeRE(srcDir).replaceAll(
                "/",
                "\\/"
              )}\/${previousLayer}`
            ),
            `Cross-imports from higher layers are not allowed`,
          ]
        );
        // TODO: should this be allowed only for "entities" layer?
        // https://feature-sliced.design/docs/reference/public-api#public-api-for-cross-imports
        patterns.push([
          new RegExp(
            String.raw`${escapeRE(srcDir).replaceAll(
              "/",
              "\\/"
            )}\/${layer}\/(?![^\/]+\/@x\/${slice}|${slice}\/)`
          ),
          `Cross-imports from different slices in the same layer are not allowed. Try to use @x instead`,
        ]);

        const impoundOptions: ImpoundOptions = {
          include,
          patterns,
        };

        // Rename the plugin uniquely to avoid conflicts
        const rename = (plugin: object) =>
          Object.assign(plugin, { name: `nuxt-fsd:impound-${layer}-${slice}` });

        addBuildPlugin({
          vite: () => rename(ImpoundPlugin.vite(impoundOptions)),
          webpack: () => rename(ImpoundPlugin.webpack(impoundOptions)),
          rspack: () => rename(ImpoundPlugin.rspack(impoundOptions)),
        });
      });
    }

    if (preventCrossImports || autoImport) {
      // If a new segment is added, restart the dev server to register the auto-imports
      // If a new slice is added, restart to register impound plugin
      const pathMatcher =
        /\/(?<layer>[^\/]+)\/(?<slice>[^\/]+)(\/(?<segment>[^\/]+))?$/;
      nuxt.addHooks({
        builder: {
          watch(event, path) {
            if (event !== "addDir") return;

            path = path.replace(srcDir, "");

            const groups = pathMatcher.exec(path)?.groups;
            if (groups == null) return;

            nuxt.callHook("restart", { hard: true });

            // TODO: detect change and make a more granular update instead of restarting the server

            const { layer, slice, segment } = groups;
            if ([appLayer, sharedLayer].includes(layer)) {
              // slice is actually segment
              // TODO: register the new dir for auto-imports
              logger.debug(`Segment "${slice}" added to layer "${layer}".`);
            } else if (segment) {
              // TODO: register the new dir for auto-imports
              logger.debug(
                `Segment "${segment}" added to layer "${layer}" under slice "${slice}".`
              );
            } else {
              // TODO: register an impound plugin for the new slice
              logger.debug(`Slice "${slice}" added to layer "${layer}".`);
            }
          },
        },
      });
    }

    const timeEnd = Date.now();
    return {
      timings: {
        setup: timeEnd - timeStart,
      },
    };
  },
});
