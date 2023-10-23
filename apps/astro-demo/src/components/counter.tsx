import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$(() => {
  const counter = useSignal(0);

  return (
    <div>
      Count: {counter.value} !
      <button onClick$={() => counter.value++}>+1</button>
    </div>
  );
});
