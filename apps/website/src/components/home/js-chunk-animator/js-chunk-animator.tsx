import {
  $,
  component$,
  useOnDocument,
  useSignal,
  useStylesScoped$,
} from "@qwik.dev/core";
import { JSChunk } from "../js-chunk/js-chunk";

export const JSChunkAnimator = component$(() => {
  const chunks = useSignal<
    {
      id: number;
      x: number;
      y: number;
      direction: number;
      height: number;
      rotation: number;
    }[]
  >([]);
  const nextId = useSignal(0);
  const hasInteracted = useSignal(false);

  useStylesScoped$(`
    .chunk-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    }

    .animated-chunk {
      position: absolute;
      animation: 
        fadeIn 0.2s linear forwards,
        popUpJS 0.3s cubic-bezier(0.2, 0.8, 0.3, 1) forwards,
        fallJS 0.9s linear(0, 0.417 25.5%, 0.867 49.4%, 1 57.7%, 0.925 65.1%, 0.908 68.6%, 0.902 72.2%, 0.916 78.2%, 0.988 92.1%, 1) forwards;
      animation-delay: 0s, 0s, 0.3s;
    }

    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    @keyframes popUpJS {
      0% {
        transform: translate(var(--x), var(--y)) scale(1) rotate(0deg);
      }
      100% {
        transform: translate(calc(var(--x) + var(--direction) * 0.3), calc(var(--y) + var(--height))) scale(1) rotate(72deg);
      }
    }

    @keyframes fallJS {
      0% {
        transform: translate(calc(var(--x) + var(--direction) * 0.3), calc(var(--y) + var(--height))) scale(1) rotate(72deg);
        opacity: 1;
      }
      100% {
        transform: translate(calc(var(--x) + var(--direction)), calc(var(--y) + 3px)) scale(0.8) rotate(360deg);
        opacity: 0.05;
      }
    }
  `);

  useOnDocument(
    "click",
    $((event) => {
      const target = event.target as HTMLElement;
      const jsElement = target.closest("[data-js]");
      if (jsElement) {
        if (hasInteracted.value) return;

        hasInteracted.value = true;
        const rect = jsElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2 + window.scrollX;
        const topY = rect.top - 30 + window.scrollY;

        // Find landing targets
        const targets = document.querySelectorAll(
          ".cli-copy, .navigation a",
        );
        const targetRects = Array.from(targets).map((el) =>
          el.getBoundingClientRect(),
        );

        const newChunks = Array.from({ length: 3 }, (_, i) => {
          const targetRect =
            targetRects[i < 2 ? i : Math.floor(Math.random() * targetRects.length)];
          const jitter = (Math.random() - 0.5) * (targetRect?.width ?? 60);
          const landX = targetRect
            ? targetRect.left +
              targetRect.width / 2 +
              jitter -
              centerX
            : (Math.random() - 0.5) * 400;
          const height = -140 - Math.random() * 80;
          return {
            id: nextId.value++,
            x: centerX,
            y: topY,
            direction: landX,
            height,
            rotation: Math.random() < 0.5 ? 360 : -360,
          };
        });

        chunks.value = [...chunks.value, ...newChunks];
      }
    }),
  );

  return (
    <div class="chunk-container">
      {chunks.value.map((chunk) => (
        <div
          key={chunk.id}
          class="animated-chunk"
          style={{
            "--x": `${chunk.x}px`,
            "--y": `${chunk.y}px`,
            "--direction": `${chunk.direction}px`,
            "--height": `${chunk.height}px`,
            "--rotation": `${chunk.rotation}deg`,
          }}
        >
          <JSChunk />
        </div>
      ))}
    </div>
  );
});
