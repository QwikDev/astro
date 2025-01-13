import {
  $,
  component$,
  useOnDocument,
  useSignal,
  useStylesScoped$
} from "@builder.io/qwik";
import { JSChunk } from "../js-chunk/js-chunk";

export const JSChunkAnimator = component$(() => {
  const chunks = useSignal<
    { id: number; x: number; y: number; direction: number; rotation: number }[]
  >([]);
  const nextId = useSignal(0);

  useStylesScoped$(`
    .chunk-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    }

    .animated-chunk {
      position: fixed;
      animation: popOutJS 1.2s linear(0, 1 37.8%, 0.883 44.2%, 0.855 47.1%, 0.846 50%, 0.853 52.7%, 0.875 55.5%, 1 65.5%, 0.967 69.4%, 0.957 73.1%, 0.964 76.5%, 1 84.5%, 0.993 89.3%, 1) forwards;
    }

    @keyframes popOutJS {
      0% {
        transform: translate(var(--x), var(--y)) scale(1) rotate(0deg);
        opacity: 1;
      }
      70% {
        transform: translate(calc(var(--x) + var(--direction)), calc(var(--y) + 50px)) scale(1.2) rotate(360deg);
        opacity: 1;
      }
      100% {
        transform: translate(calc(var(--x) + var(--direction)), calc(var(--y) + 200px)) scale(0.8) rotate(360deg);
        opacity: 0;
      }
    }
  `);

  useOnDocument(
    "click",
    $((event) => {
      const target = event.target as HTMLElement;
      const jsElement = target.closest("[data-js]");
      if (jsElement) {
        const rect = jsElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const newChunks = Array.from({ length: 3 }, (_, i) => {
          const direction = (i - 1) * 200;
          return {
            id: nextId.value++,
            x: centerX,
            y: centerY,
            direction,
            rotation: direction > 0 ? 360 : -360
          };
        });

        chunks.value = [...chunks.value, ...newChunks];
      }
    })
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
            "--rotation": `${chunk.rotation}deg`
          }}
        >
          <JSChunk />
        </div>
      ))}
    </div>
  );
});
