// import { component$, useSignal } from "@builder.io/qwik";

import { componentQrl, inlinedQrl, useSignal } from "@builder.io/qwik";

// export const Counter = component$(() => {
//   const counter = useSignal(0);

//   return <button onClick$={() => counter.value++}>{counter.value}</button>;
// });

export const Counter = componentQrl(
  inlinedQrl(() => {
    const counter = useSignal(0);

    return <button>{counter.value}</button>;
  }, "counterqrl")
);
