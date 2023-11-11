import { qwikVite } from '@builder.io/qwik/optimizer';
import { getQwikLoaderScript } from '@builder.io/qwik/server';
import { build } from 'vite';

import { copyFile, lstat, mkdir, readdir, unlink } from 'node:fs/promises';
import { createReadStream, rmSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, relative } from 'node:path';

import type { AstroConfig, AstroIntegration } from 'astro';

export default function createIntegration(): AstroIntegration {
  let astroConfig: AstroConfig | null = null;
  let distDir: string = '';
  let tempDir = join(distDir, '.tmp-' + hash());
  let entrypoints: Promise<string[]> = getQwikEntrypoints('./src');

  return {
    name: '@qwikdev/astro',
    hooks: {
      'astro:config:setup': async ({
        addRenderer,
        updateConfig,
        injectScript,
        config,
      }) => {
        if ((await entrypoints).length !== 0) {
          addRenderer({
            name: '@qwikdev/astro',
            serverEntrypoint: '@qwikdev/astro/server',
          });

          astroConfig = config;
          distDir = relative(
            astroConfig.root.pathname,
            astroConfig.outDir.pathname
          );

          // adds qwikLoader once (instead of per container)
          injectScript('head-inline', getQwikLoaderScript());

          updateConfig({
            vite: {
              build: {
                rollupOptions: {
                  output: {
                    inlineDynamicImports: false,
                  },
                },
              },
              outDir: astroConfig.outDir.pathname,
              plugins: [
                qwikVite({
                  devSsrServer: false,
                  entryStrategy: {
                    type: 'smart',
                  },
                  client: {
                    // In order to make a client build, we need to know
                    // all of the entry points to the application so
                    // that we can generate the manifest.
                    input: await entrypoints,
                    outDir: distDir,
                  },
                  ssr: {
                    input: '@qwikdev/astro/server',
                  },
                }),
              ],
            },
          });
        }
      },
      'astro:config:done': async ({ config }) => {
        astroConfig = config;
      },
      'astro:build:start': async ({ logger }) => {
        logger.info('astro:build:start');

        if ((await entrypoints).length > 0) {
          await build({ ...astroConfig?.vite });
          await moveArtifacts(distDir, tempDir);
        } else {
          logger.info('No entrypoints found. Skipping build.');
        }
      },
      'astro:build:done': async ({ logger }) => {
        if ((await entrypoints).length > 0) {
          // TODO: Fix this and have one source of truth, instead of reaching for this dist file that qwikVite seems to create for us automatically
          let nodeBuildPath = 'client';

          if (distDir !== 'dist') {
            nodeBuildPath = 'dist/client';
          }

          await moveArtifacts(
            tempDir,
            join(
              distDir,
              astroConfig?.adapter?.name === '@astrojs/node' &&
                astroConfig.output === 'server'
                ? nodeBuildPath
                : '.'
            )
          );

          // remove the temp dir folder
          rmSync(tempDir, { recursive: true });
        } else {
          logger.info('Build finished. No artifacts moved.');
        }
      },
    },
  };
}

function hash() {
  return Math.random().toString(26).split('.').pop();
}

async function moveArtifacts(srcDir: string, destDir: string) {
  await mkdir(destDir, { recursive: true });
  const files = await readdir(srcDir);

  for (const file of files) {
    const srcFile = join(srcDir, file);
    const destFile = join(destDir, file);

    const stat = await lstat(srcFile);
    if (stat.isFile()) {
      // Overwrite the destination file if it exists
      await copyFile(srcFile, destFile);
      await unlink(srcFile);
    }
  }
}

async function crawlDirectory(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = join(dir, entry.name);
      return entry.isDirectory() ? crawlDirectory(fullPath) : fullPath;
    })
  );

  // flatten files array
  return files.flat();
}

/**
 *
 * We need to find the Qwik entrypoints so that the client build will run successfully.
 *
 */
async function getQwikEntrypoints(dir: string): Promise<string[]> {
  const files = await crawlDirectory(dir);
  const qwikFiles = [];

  for (const file of files) {
    const fileStream = createReadStream(file);

    // holds readline interface
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let importFound = false;
    let builderFound = false;
    let found = false;
    for await (const line of rl) {
      if (line.includes('import')) {
        importFound = true;
      }
      if (line.includes('@builder.io/qwik')) {
        builderFound = true;
      }
      if (importFound && builderFound) {
        qwikFiles.push(file);
        found = true;
        break;
      }
    }

    if (found) {
      rl.close();
      fileStream.close();
    }
  }

  return qwikFiles;
}
