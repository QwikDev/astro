import { Slot, component$, useSignal } from "@builder.io/qwik";

export default component$(() => {
  const counter = useSignal(0);

  return (
    <div>
      <Slot />
      I'm inside astrojs-qwik!
      <button onClick$={() => counter.value++}>{counter.value}</button>
    </div>
  );
});
