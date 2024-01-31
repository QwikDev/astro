import { component$, sync$ } from "@builder.io/qwik";

export const SayHi = component$(() => {
  return (
    <button
      onKeyDown$={sync$((e: KeyboardEvent): void => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
        }
      })}
    >
      Say hi!
    </button>
  );
});
