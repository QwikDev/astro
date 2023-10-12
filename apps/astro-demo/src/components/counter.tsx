// import { component$, useSignal } from "@builder.io/qwik";

import {
  component$,
  componentQrl,
  inlinedQrl,
  useSignal,
} from "@builder.io/qwik";

export const Counter = component$(() => {
  const counter = useSignal(0);

  // builds if onClick$ / any handlers are removed
  return (
    <button
      onClick$={() => counter.value++}
      // /
    >
      {counter.value}
    </button>
  );
});

// INLINE WAY IN QWIK (without the optimizer)

// export const Hello = componentQrl(
//   inlinedQrl(() => {
//     const counter = useSignal(0);

//     return <button>Hello World</button>;
//   }, "helloqrl")
// );
