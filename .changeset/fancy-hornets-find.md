---
"@qwikdev/astro": patch
---

feat: Support Qwik Render Options at runtime on a per-component basis.

This is useful for scenarios where you want to render a Qwik component in an Astro page, but you want to use a different base URL for the Qwik component, or another configuration.

For example, if you want to render a Qwik component in an Astro page, but you want to use a different base URL for the Qwik component, you can pass the `renderOpts` prop to the Qwik component.

```astro
<NativeCounter initial={2} renderOpts={{ base: "http://0.0.0.0:4321/build" }} />
```

Make sure to import the `RenderOptions` type from `@builder.io/qwik/server` and pass it to the component for type safety.

Want to make a change for all components? Create a global object config and pass it to each component.