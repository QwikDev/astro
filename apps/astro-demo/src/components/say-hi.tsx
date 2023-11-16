import { component$ } from "@builder.io/qwik";

export const SayHi = component$(() => {
  return <button onClick$={() => console.log("hi")}>Say hi!</button>;
});
