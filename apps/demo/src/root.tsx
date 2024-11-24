import { Slot, component$ } from "@builder.io/qwik";
import { Counter } from "@components/qwik/counter";

export default component$(() => {
  return (
    <>
      <Slot />
      <Counter initial={5}>Yo</Counter>
    </>
  );
});
