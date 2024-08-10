import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import esbuild, { type BuildOptions } from "esbuild";
import { globbySync } from "globby";
import tsconfig from "../tsconfig.json";

export type Target = BuildOptions["target"] | "default";
export type Format = BuildOptions["format"];
export type Platform = BuildOptions["platform"];

const entryPoints = globbySync(tsconfig.include, {
  gitignore: true,
  ignore: tsconfig.exclude
});

const outdir = tsconfig.compilerOptions.outDir;
const target = tsconfig.compilerOptions.target || "default";
const watch = process.argv.includes("--watch");

build(entryPoints, outdir, target, [undefined, "cjs", "esm"], true, watch);

const files = fs.readdirSync(outdir);
for (const file of files) {
  const filePath = path.join(outdir, file);
  await outputSize(filePath);
}

function getBuildOptions(
  { format, minify, ...options }: BuildOptions,
  watch: boolean
): BuildOptions {
  const define = {
    CDN: "true",
    "process.env.NODE_ENV": watch ? '"development"' : '"production"'
  };

  return {
    ...options,
    platform: "node",
    bundle: true,
    minify,
    format: format ?? format,
    sourcemap: !minify,
    outExtension:
      format === "cjs"
        ? { ".js": ".cjs" }
        : format === "esm"
          ? { ".js": ".mjs" }
          : { ".js": ".js" },
    define
  };
}

async function build(
  entryPoints: string[],
  outdir: string,
  target: Target,
  formats: Format[] = ["cjs", "esm"],
  minify = false,
  watch = false
) {
  for (const format of formats) {
    const options = getBuildOptions(
      {
        entryPoints,
        outdir,
        target,
        format,
        minify
      },
      watch
    );
    await (watch
      ? esbuild.context(options).then((ctx) => ctx.watch())
      : esbuild.build(options));
  }
}

async function outputSize(file: string) {
  const content = fs.readFileSync(file);
  const bytes = zlib.brotliCompressSync(content).length;
  const size = bytesToSize(bytes);

  console.log("\x1b[32m", `${file} bundle size: ${size}`);
}

function bytesToSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) {
    return "n/a";
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i === 0) {
    return `${bytes} ${sizes[i]}`;
  }
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}
