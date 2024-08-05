import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$(() => {
  const count = useSignal(0);

  return (
    <div>
      <p>Count: {count.value}</p>
      <p>
        <button type="button" onClick$={() => count.value++}>
          Increment
        </button>
      </p>
    </div>
  );
});
