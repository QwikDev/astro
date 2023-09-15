import { defineConfig } from "astro/config";
import qwik from "@astrojs/qwik";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik()],
});
