import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { build } from "astro";

const fixtureDir = fileURLToPath(new URL("../fixtures/node/", import.meta.url));
const distDir = join(fixtureDir, "dist");
const clientDir = join(distDir, "client");
const serverDir = join(distDir, "server");

async function buildFixture() {
  const prevCwd = process.cwd();
  process.chdir(fixtureDir);
  try {
    await build({});
  } finally {
    process.chdir(prevCwd);
  }
}

async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(fullPath)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function getAvailablePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Unable to allocate test port");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  return address.port;
}

test.describe("Node Adapter Build", () => {
  test.beforeAll(async () => {
    if (existsSync(distDir)) {
      await rm(distDir, { recursive: true });
    }
    await buildFixture();
  });

  test("creates client and server directories", () => {
    expect(existsSync(clientDir)).toBe(true);
    expect(existsSync(serverDir)).toBe(true);
  });

  test("client directory contains Qwik JS chunks", async () => {
    const files = await collectFiles(clientDir);
    const qwikChunks = files.filter((f) => f.endsWith(".js") && f.includes("q-"));
    expect(qwikChunks.length).toBeGreaterThan(0);
  });

  test("client directory contains a populated q-manifest.json", async () => {
    const files = await collectFiles(clientDir);
    const manifest = files.find((f) => f.endsWith("q-manifest.json"));
    expect(manifest).toBeDefined();

    const contents = JSON.parse(await readFile(manifest!, "utf-8"));
    expect(contents.core).toBeTruthy();
    expect(Object.keys(contents.mapping)).not.toHaveLength(0);
  });

  test("server directory contains the Astro adapter entry", () => {
    expect(existsSync(join(serverDir, "index.mjs"))).toBe(true);
  });

  test("Astro adapter entry serves SSR-rendered Qwik components", async () => {
    const port = await getAvailablePort();
    const child = spawn(process.execPath, [join(serverDir, "index.mjs")], {
      cwd: fixtureDir,
      env: {
        ...process.env,
        ASTRO_NODE_LOGGING: "disabled",
        HOST: "127.0.0.1",
        PORT: String(port)
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));

    try {
      let response: Response | undefined;
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          response = await fetch(`http://127.0.0.1:${port}/`);
          if (response.ok) break;
        } catch {
          await delay(100);
        }
      }

      expect(response?.ok, output).toBe(true);
      expect(await response!.text()).toContain("q:container");
    } finally {
      child.kill("SIGTERM");
    }
  });
});
