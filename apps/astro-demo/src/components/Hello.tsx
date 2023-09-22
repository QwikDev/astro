// import { component$, useSignal } from "@builder.io/qwik";

import {
  component$,
  componentQrl,
  inlinedQrl,
  useSignal,
} from "@builder.io/qwik";

// export const Hello = component$(() => {
//   const counter = useSignal(0);

//   return <button onClick$={() => counter.value++}>{counter.value}</button>;
// });

// export const Counter = componentQrl(
//   inlinedQrl(() => {
//     const counter = useSignal(0);

//     return <button>{counter.value}</button>;
//   }, "counterqrl")
// );

export const Hello = componentQrl(
  inlinedQrl(() => {
    return <p>Hello World</p>;
  }, "helloqrl")
);
