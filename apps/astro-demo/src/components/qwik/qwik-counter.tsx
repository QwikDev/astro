import { component$, useSignal, Slot } from "@builder.io/qwik";

export const QwikCounter = component$(() => {
  const counter = useSignal(0);

  return (
    <>
      <button onClick$={() => counter.value++}>Qwik {counter.value}</button>
    </>
  );
});
