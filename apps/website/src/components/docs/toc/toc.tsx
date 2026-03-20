import {
  $,
  component$,
  useOnDocument,
  useSignal,
  useStyles$,
} from "@qwik.dev/core";
import styles from "./toc.css?inline";

type TocItem = {
  label: string;
  id: string;
  level: number;
};

export const Toc = component$<{ items: TocItem[] }>(({ items }) => {
  useStyles$(styles);
  const activeId = useSignal("");

  useOnDocument(
    "scroll",
    $(() => {
      const headings = items
        .map((item) => document.getElementById(item.id))
        .filter(Boolean) as HTMLElement[];

      let current = "";
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= 100) {
          current = heading.id;
        }
      }
      activeId.value = current;
    }),
  );

  return (
    <aside class="toc">
      <span class="toc-title">On this page</span>
      <nav class="toc-nav">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            class={`toc-link${item.level > 2 ? " toc-link-nested" : ""}${activeId.value === item.id ? " active" : ""}`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div class="toc-more">
        <span class="toc-title">More</span>
        <a
          href="https://github.com/QwikDev/astro/issues"
          target="_blank"
          rel="noopener"
          class="toc-external"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <span>Create an issue</span>
        </a>
        <a
          href="https://discord.com/channels/842438759945601056/1150941080355881080"
          target="_blank"
          rel="noopener"
          class="toc-external"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
          <span>Join our community</span>
        </a>
        <a
          href="https://github.com/QwikDev/astro"
          target="_blank"
          rel="noopener"
          class="toc-external"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </aside>
  );
});
