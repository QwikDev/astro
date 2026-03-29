import {
  $,
  type Signal,
  component$,
  useSignal,
  useStyles$,
} from "@qwik.dev/core";
import qwikAstroLogo from "../../../assets/qwik-v2-logo.svg?raw";
import { AstroIcon } from "../../../icons/astro";
import { QwikIcon } from "../../../icons/qwik";
import styles from "./logo-hover.css?inline";

export const LogoHover = component$(() => {
  useStyles$(styles);

  const astroLogoRef = useSignal<HTMLElement>();
  const qwikLogoRef = useSignal<HTMLElement>();

  const showCursor = $((logoRef: Signal<HTMLElement | undefined>) => {
    if (!logoRef.value) return;
    logoRef.value.style.opacity = "1";
    logoRef.value.style.scale = "1";
  });

  const moveCursor = $(
    (
      logoRef: Signal<HTMLElement | undefined>,
      clientX: number,
      clientY: number,
    ) => {
      if (!logoRef.value) return;
      logoRef.value.style.left = `${clientX}px`;
      logoRef.value.style.top = `${clientY}px`;
    },
  );

  const hideCursor = $((logoRef: Signal<HTMLElement | undefined>) => {
    if (!logoRef.value) return;
    logoRef.value.style.opacity = "0";
    logoRef.value.style.scale = "0";
  });

  return (
    <div
      class="logo-hover"
      onMouseLeave$={() => {
        hideCursor(qwikLogoRef);
        hideCursor(astroLogoRef);
      }}
    >
      <h1>
        <span
          class="word hoverable"
          data-intro
          style="animation-delay: 0s; opacity: 0;"
          onMouseEnter$={() => showCursor(qwikLogoRef)}
          onMouseMove$={({ clientX, clientY }) =>
            moveCursor(qwikLogoRef, clientX, clientY)
          }
          onMouseLeave$={() => hideCursor(qwikLogoRef)}
        >
          QWIK
        </span>
        <span
          class="word"
          data-intro
          style="animation-delay: 0.35s; opacity: 0;"
        >
          +
        </span>
        <span
          class="word hoverable"
          data-intro
          style="animation-delay: 0.7s; opacity: 0;"
          onMouseEnter$={() => showCursor(astroLogoRef)}
          onMouseMove$={({ clientX, clientY }) =>
            moveCursor(astroLogoRef, clientX, clientY)
          }
          onMouseLeave$={() => hideCursor(astroLogoRef)}
        >
          ASTRO
        </span>
        <span
          class="word"
          data-intro
          style="animation-delay: 1.05s; opacity: 0;"
        >
          =
        </span>
        <span
          class="logo-reveal"
          data-intro
          style="animation-delay: 1.6s; opacity: 0;"
          dangerouslySetInnerHTML={qwikAstroLogo}
        />
      </h1>
      <QwikIcon ref={qwikLogoRef} class="qwik-logo logo-cursor" />
      <AstroIcon ref={astroLogoRef} class="astro-logo logo-cursor" />
    </div>
  );
});
