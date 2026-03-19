import { Slot, component$, useSignal, useVisibleTask$ } from "@qwik.dev/core";
import type { RenderOptions } from "@qwik.dev/core/server";

export const Counter = component$<{ initial: number; renderOpts?: RenderOptions }>(
  (props) => {
    const counter = useSignal(props.initial);

    useVisibleTask$(() => {
      console.log("FROM VISIBLE TASK")
    })

    return (
      <button
        type="button"
        onClick$={() => {
          counter.value++;
        }}
      >
        <Slot /> {counter.value}
      </button>
    );
  }
);
