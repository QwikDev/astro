import { Slot, component$, useSignal } from "@builder.io/qwik";
import type { RenderOptions } from "@builder.io/qwik/server";

export const Counter = component$<{ initial: number; renderOpts?: RenderOptions }>(
  (props) => {
    const counter = useSignal(props.initial);

    return (
      <button type="button" onClick$={() => counter.value++}>
        <Slot /> {counter.value}
      </button>
    );
  }
);
