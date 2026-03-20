import { AstroIcon } from "@icons/astro";
import { QwikIcon } from "@icons/qwik";
import {
  $,
  type Signal,
  component$,
  useSignal,
  useStyles$
} from "@qwik.dev/core";
import styles from "./logo-hover.css?inline";
import qwikAstroLogo from "@assets/qwik-v2-logo.svg?raw";

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
      logoRef.value.style.transform = `translate(${x}px, ${y}px)`;
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
          onMouseEnter$={() => handleMouseEnter(qwikLogoRef, qwikRect)}
          onMouseMove$={({ clientX, clientY }) =>
            handleMouseMove(qwikLogoRef, qwikRect, clientX, clientY)
          }
          onMouseLeave$={() => handleMouseLeave(qwikLogoRef)}
        >
          {"QWIK".split("").map((letter, i) => (
            <span class="letter" key={letter} style={`animation-delay: ${i * 0.15}s;`}>
              {letter}
            </span>
          ))}
        </span>
        <span class="letter plus" style="animation-delay: 0.6s;">+</span>
        <span
          onMouseEnter$={() => handleMouseEnter(astroLogoRef, astroRect)}
          onMouseMove$={({ clientX, clientY }) =>
            handleMouseMove(astroLogoRef, astroRect, clientX, clientY)
          }
          onMouseLeave$={() => handleMouseLeave(astroLogoRef)}
        >
          {"ASTRO".split("").map((letter, i) => (
            <span
              class="letter"
              key={letter}
              style={`animation-delay: ${(i + 6) * 0.15}s;`}
            >
              {letter}
            </span>
          ))}
        </span>
        <span class="letter equals" style="animation-delay: 1.65s;">=</span>
        <span class="letter logo-reveal" style="animation-delay: 1.8s;" dangerouslySetInnerHTML={qwikAstroLogo} />
      </h1>
      <QwikIcon ref={qwikLogoRef} class="qwik-logo tooltip" />
      <AstroIcon ref={astroLogoRef} class="astro-logo tooltip" />
    </div>
  );
});
