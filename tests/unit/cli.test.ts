import { mkdirSync, rmSync } from "node:fs";
import { afterEach } from "node:test";
import app from "@qwikdev/create-astro/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const rootDir = "tests/apps";
const projectName = "test-app";
const cwd = process.cwd();

beforeAll(() => {
  mkdirSync(rootDir, { recursive: true });
});

beforeEach(() => {
  process.chdir(rootDir);
});

afterEach(() => {
  process.chdir(cwd);
});

afterAll(() => {
  rmSync(rootDir, { recursive: true, force: true });
});

describe(`${app.name}@${app.version}`, () => {
  it("should create a new app", async () => {
    const result = await app.run(["pnpm", "create", projectName]);

    expect(result).toBe(0);
  });
});
