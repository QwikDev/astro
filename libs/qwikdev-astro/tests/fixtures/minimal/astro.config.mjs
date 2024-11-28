import { defineConfig } from "astro/config";

import qwik from "../../../src/index";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik()]
});
