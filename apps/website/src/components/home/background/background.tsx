import { component$, useStylesScoped$ } from "@qwik.dev/core";
import styles from "./background.css?inline";

export const Background = component$(() => {
  useStylesScoped$(styles);

  return (
    <div class="background-wrapper" aria-hidden="true">
      <div />
      <span />
    </div>
  );
});
