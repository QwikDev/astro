import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

import qwik from "@qwikdev/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik()]
});
