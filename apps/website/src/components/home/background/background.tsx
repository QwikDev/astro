import { component$, useStylesScoped$ } from "@qwik.dev/core";
import styles from "./background.css?inline";

export const Background = component$(() => {
  useStylesScoped$(styles);

  return (
    <div class="background-wrapper" data-intro aria-hidden="true">
      <div />
      <span />
    </div>
  );
});
