import { component$, useStyles$ } from "@builder.io/qwik";
import { AstroIcon } from "@icons/astro";
import { QwikIcon } from "@icons/qwik";
import styles from "./logo-hover.css?inline";

export const LogoHover = component$(() => {
  useStyles$(styles);

  return (
    <>
      <span>
        {"QWIK".split("").map((letter, i) => (
          <span class="letter" key={letter} style={`animation-delay: ${i * 0.15}s;`}>
            {letter}
          </span>
        ))}
      </span>
      <span>
        {"ASTRO".split("").map((letter, i) => (
          <span
            class="letter"
            key={letter}
            style={`animation-delay: ${(i + 5) * 0.15}s;`}
          >
            {letter}
          </span>
        ))}
      </span>
      <QwikIcon />
      <AstroIcon />
    </>
  );
});
