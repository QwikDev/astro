// Example Qwik component for multi-framework projects.
// This counter demonstrates Qwik's fine-grained reactivity with useSignal.
import { component$, useSignal } from "@qwik.dev/core";

export const Counter = component$(() => {
  const count = useSignal(0);

  return (
    <button onClick$={() => count.value++}>
      Count: {count.value}
    </button>
  );
});
