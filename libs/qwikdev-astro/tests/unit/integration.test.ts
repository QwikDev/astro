import { loadFixture } from "@inox-tools/astro-tests/astroFixture";
import { beforeAll, describe, expect, test } from "vitest";

function clearGlobalState() {
  (globalThis as any).qManifest = undefined;
  (globalThis as any).symbolMapperFn = undefined;
}

describe("Basic sanity check", () => {
  let preview: any;
  let fixture: any;

  beforeAll(async () => {
    fixture = await loadFixture({
      root: "../fixtures/minimal",
      logLevel: "debug",
      vite: {
        logLevel: "debug",
        optimizeDeps: {
          noDiscovery: false
        }
      }
    });

    clearGlobalState();

    console.log("Building");
    // Build with explicit configuration
    await fixture.build();

    console.log("Starting preview server");
    preview = await fixture.preview({});
  });

  test("it builds", async () => {
    const res = await fixture.fetch("/");

    expect(res.ok).toBe(true);
  });
});
