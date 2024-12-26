import qwikdev from "@qwikdev/astro";
import icon from "astro-icon";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [qwikdev(), icon()]
});
