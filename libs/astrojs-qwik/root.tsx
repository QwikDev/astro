import { Slot, component$, useSignal } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div>
      <Slot />
      I'm inside astrojs-qwik root!
    </div>
  );
});
