import { Slot, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

export const Counter = component$<{ initial: number }>((props) => {
  const counter = useSignal(props.initial);

  useVisibleTask$(() => {
    console.log("useVisibleTask$");
  })

  return (
    <button type="button" onClick$={() => counter.value++}>
      <Slot /> {counter.value}
    </button>
  );
});
