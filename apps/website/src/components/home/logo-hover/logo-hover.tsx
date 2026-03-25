import { $, type Signal, component$, useSignal, useStyles$ } from "@qwik.dev/core";
import qwikAstroLogo from "../../../assets/qwik-v2-logo.svg?raw";
import { AstroIcon } from "../../../icons/astro";
import { QwikIcon } from "../../../icons/qwik";
import styles from "./logo-hover.css?inline";

export const LogoHover = component$(() => {
  useStyles$(styles);

  const astroLogoRef = useSignal<HTMLElement>();
  const qwikLogoRef = useSignal<HTMLElement>();
  const qwikRect = useSignal<DOMRect>();
  const astroRect = useSignal<DOMRect>();

  const handleMouseEnter = $(
    (logoRef: Signal<HTMLElement | undefined>, rectRef: Signal<DOMRect | undefined>) => {
      if (!logoRef.value) return;
      logoRef.value.style.opacity = "1";
      logoRef.value.style.scale = "1";
      rectRef.value = logoRef.value.getBoundingClientRect();
    }
  );

  const handleMouseMove = $(
    (
      logoRef: Signal<HTMLElement | undefined>,
      rectRef: Signal<DOMRect | undefined>,
      clientX: number,
      clientY: number,
      offset = { x: 10, y: -45 }
    ) => {
      if (!rectRef.value) return;
      if (!logoRef.value) return;
      const x = clientX - rectRef.value.left + offset.x;
      const y = clientY - rectRef.value.top + offset.y;
      logoRef.value.style.setProperty("--tx", `${x}px`);
      logoRef.value.style.setProperty("--ty", `${y}px`);
    }
  );

  const handleMouseLeave = $((logoRef: Signal<HTMLElement | undefined>) => {
    if (!logoRef.value) return;
    logoRef.value.style.opacity = "0";
    logoRef.value.style.scale = "0";
  });

  return (
    <div class="logo-hover">
      <h1>
        <span
          class="word"
          style="animation-delay: 0s; opacity: 0;"
          onMouseEnter$={() => handleMouseEnter(qwikLogoRef, qwikRect)}
          onMouseMove$={({ clientX, clientY }) =>
            handleMouseMove(qwikLogoRef, qwikRect, clientX, clientY)
          }
          onMouseLeave$={() => handleMouseLeave(qwikLogoRef)}
        >
          QWIK
        </span>
        <span class="word" style="animation-delay: 0.4s; opacity: 0;">
          +
        </span>
        <span
          class="word"
          style="animation-delay: 0.8s; opacity: 0;"
          onMouseEnter$={() => handleMouseEnter(astroLogoRef, astroRect)}
          onMouseMove$={({ clientX, clientY }) =>
            handleMouseMove(astroLogoRef, astroRect, clientX, clientY)
          }
          onMouseLeave$={() => handleMouseLeave(astroLogoRef)}
        >
          ASTRO
        </span>
        <span class="word" style="animation-delay: 1.2s; opacity: 0;">
          =
        </span>
        <span
          class="logo-reveal"
          style="animation-delay: 2.2s; opacity: 0;"
          dangerouslySetInnerHTML={qwikAstroLogo}
        />
      </h1>
      <QwikIcon ref={qwikLogoRef} class="qwik-logo tooltip" />
      <AstroIcon ref={astroLogoRef} class="astro-logo tooltip" />
    </div>
  );
});
