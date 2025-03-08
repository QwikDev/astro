import { $, Slot, component$, useSignal, useStyles$ } from "@builder.io/qwik";
import styles from "./spotlight.css?inline";

export const Spotlight = component$(() => {
  useStyles$(styles);
  const xPos = useSignal(10);
  const yPos = useSignal(50);
  const overlayRef = useSignal<HTMLDivElement>();
  const rectRef = useSignal<DOMRect>();

  const onPointerEnter$ = $(() => {
    if (!overlayRef.value) return;
    overlayRef.value.classList.remove("leaving");
    overlayRef.value.classList.add("entering");
    rectRef.value = overlayRef.value.getBoundingClientRect();
  });

  const onPointerMove$ = $((e: PointerEvent) => {
    if (!overlayRef.value) return;
    if (!rectRef.value) return;

    overlayRef.value.classList.remove("entering", "leaving");
    overlayRef.value.classList.add("moving");

    xPos.value = ((e.clientX - rectRef.value.left) / rectRef.value.width) * 100;
    yPos.value = ((e.clientY - rectRef.value.top) / rectRef.value.height) * 100;
    overlayRef.value.style.setProperty("--x-pos", `${xPos.value}%`);
    overlayRef.value.style.setProperty("--y-pos", `${yPos.value}%`);
  });

  const onPointerLeave$ = $(() => {
    console.log("leave");
    if (!overlayRef.value) return;

    overlayRef.value.classList.add("leaving");
    overlayRef.value.classList.remove("moving");
    if (window.innerWidth <= 1024) {
      overlayRef.value.style.setProperty("--x-pos", "92px");
      overlayRef.value.style.setProperty("--y-pos", "50%");
    } else {
      overlayRef.value.style.setProperty("--x-pos", "10%");
      overlayRef.value.style.setProperty("--y-pos", "50%");
    }
  });

  return (
    <div class="overlay-container">
      <Slot />
      <div
        ref={overlayRef}
        class="overlay"
        onPointerEnter$={onPointerEnter$}
        onPointerMove$={onPointerMove$}
        onPointerLeave$={onPointerLeave$}
        style={{
          background: `radial-gradient(
                        circle var(--space-4xl) at var(--x-pos) var(--y-pos),
                        transparent 0%,
                        transparent 30%,
                        var(--off-black) 70%
                    )`
        }}
      />
    </div>
  );
});
