import { Slot, component$, sync$ } from "@qwik.dev/core";

export const SayHi = component$(() => {
  return (
    <button
      type="button"
      onKeyDown$={sync$((e: KeyboardEvent): void => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
        }
      })}
    >
      <Slot />
      Say hi!
    </button>
  );
});
