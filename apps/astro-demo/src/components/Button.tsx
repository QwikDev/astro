import { component$ } from "@builder.io/qwik";

export const Button = component$(() => {
  return (
    <button onClick$={() => console.log("I should resume!")}>Click me!</button>
  );
});
