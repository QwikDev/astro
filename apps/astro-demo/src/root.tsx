/*
Qwik

The src/root.tsx file is the entry point for the application tree. It's the first component that will be rendered. It's the root of the tree.

*/

import { Slot, component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div>
      <Slot />
      I'm inside astrojs-qwik root!
    </div>
  );
});
