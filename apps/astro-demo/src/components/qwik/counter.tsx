import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$<{ initial: number }>((props) => {
  const counter = useSignal(props.initial);

  return (
    <>
      <button type="button" onClick$={() => counter.value++}>
        {counter.value}
      </button>
    </>
  );
});
