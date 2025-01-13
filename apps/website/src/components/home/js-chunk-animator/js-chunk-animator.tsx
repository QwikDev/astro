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
        const rect = jsElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const topY = rect.top - 30;

        const newChunks = Array.from({ length: 3 }, (_, i) => {
          const direction = (Math.random() - 0.5) * 400;
          const height = i === 0 ? -180 : -120;
          return {
            id: nextId.value++,
            x: centerX,
            y: topY,
            direction,
            height,
            rotation: Math.random() < 0.5 ? 360 : -360
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
            "--height": `${chunk.height}px`,
            "--rotation": `${chunk.rotation}deg`
          }}
        >
          <JSChunk />
        </div>
      ))}
    </div>
  );
});
