import { component$, useSignal } from "@qwik.dev/core";

import styles from "./counter.module.css";

export const Counter = component$(() => {
  const count = useSignal(0);

  return (
    <>
      <div class={styles.container}>
        <button
          class={styles.counter}
          type="button"
          onClick$={() => count.value++}
        >
          count is {count.value}
        </button>
      </div>
    </>
  );
});
