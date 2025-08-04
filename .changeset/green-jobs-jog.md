---
"@qwikdev/astro": patch
---

feat: support global config for renderOpts

You can now pass the `renderOpts` option to the `qwik` integration to set global render options for all Qwik components.

For example, let's say we wanted to change the base URL for all Qwik build assets on every component used in an Astro file.

```ts
import { defineConfig } from "astro/config";
import qwik from "@qwikdev/astro";

export default defineConfig({
  integrations: [qwik({ include: "**/qwik/*", renderOpts: { base: "my-cdn-url/build" } })]
});
```