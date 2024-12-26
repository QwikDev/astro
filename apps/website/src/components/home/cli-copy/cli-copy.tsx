import {
  type PropsOf,
  Slot,
  component$,
  useSignal,
  useStyles$,
  useTask$
} from "@builder.io/qwik";
import styles from "./cli-copy.css?inline";

export const CLICopy = component$((props: PropsOf<"button">) => {
  const isCopied = useSignal(false);
  useStyles$(styles);

  useTask$(({ track }) => {
    track(() => isCopied.value);

    if (!isCopied.value) return;

    setTimeout(() => {
      isCopied.value = false;
    }, 4000);
  });

  return (
    <button
      type="button"
      class="cli-copy"
      onClick$={() => {
        navigator.clipboard.writeText("npm create @qwikdev/astro@latest");
        isCopied.value = true;
      }}
      data-click-success={isCopied.value ? "true" : "false"}
      {...props}
    >
      <span>{isCopied.value ? "Copied!" : "Copy CLI command"}</span>
      <Slot />
    </button>
  );
});
