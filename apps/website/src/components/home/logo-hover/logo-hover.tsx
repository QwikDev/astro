import { $, component$, useSignal, useStyles$, useVisibleTask$ } from "@builder.io/qwik";
import { AstroIcon } from "@icons/astro";
import { QwikIcon } from "@icons/qwik";
import styles from "./logo-hover.css?inline";

export const LogoHover = component$(() => {
  useStyles$(styles);

  const astroLogoRef = useSignal<HTMLElement>();
  const qwikLogoRef = useSignal<HTMLElement>();

  return (
    <>
      <div class="intro">
        <h1>
          <span
            onMouseEnter$={$(() => {
              if (!qwikLogoRef.value) return;
              qwikLogoRef.value.style.opacity = "1";
              qwikLogoRef.value.style.scale = "1";
            })}
            onMouseMove$={$(({ clientX, clientY }) => {
              if (!qwikLogoRef.value) return;
              const x = clientX - qwikLogoRef.value.offsetWidth / 2;
              const y = clientY - qwikLogoRef.value.offsetHeight / 2;
              qwikLogoRef.value.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            })}
            onMouseLeave$={$(() => {
              if (!qwikLogoRef.value) return;
              qwikLogoRef.value.style.opacity = "0";
              qwikLogoRef.value.style.scale = "0";
            })}
          >
            {"QWIK".split("").map((letter, i) => (
              <span class="letter" key={letter} style={`animation-delay: ${i * 0.15}s;`}>
                {letter}
              </span>
            ))}
          </span>
          <span
            onMouseEnter$={$(() => {
              if (!astroLogoRef.value) return;
              astroLogoRef.value.style.opacity = "1";
              astroLogoRef.value.style.scale = "1";
            })}
            onMouseMove$={$(({ clientX, clientY }) => {
              console.log("hi");
            })}
            onMouseLeave$={$(() => {
              if (!astroLogoRef.value) return;
              astroLogoRef.value.style.opacity = "0";
              astroLogoRef.value.style.scale = "0";
            })}
          >
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
        </h1>
      </div>
      <QwikIcon ref={qwikLogoRef} class="qwik-logo tooltip" />
      <AstroIcon ref={astroLogoRef} class="astro-logo tooltip" />
    </>
  );
});
