import { modal } from "@qds.dev/ui";
import {
  $,
  component$,
  sync$,
  useOnDocument,
  useSignal,
  useStyles$,
  useVisibleTask$
} from "@qwik.dev/core";
import { navItems } from "../nav-items";
import styles from "./search-modal.css?inline";

type SearchResult = {
  url: string;
  excerpt: string;
  meta?: { title?: string };
};

type Pagefind = {
  search(query: string): Promise<{
    results: Array<{ data(): Promise<SearchResult> }>;
  }>;
};

declare global {
  var __pagefind: Pagefind | undefined;
}

export const SearchModal = component$(() => {
  useStyles$(styles);

  const isOpen = useSignal(false);
  const activeIndex = useSignal(-1);
  const listRef = useSignal<HTMLDivElement>();
  const query = useSignal("");
  const results = useSignal<SearchResult[]>();

  // Patch dialog.close() to animate out before actually closing
  useVisibleTask$(() => {
    const dialog = document.querySelector<HTMLDialogElement>(".search-dialog");
    if (!dialog) return;
    const nativeClose = dialog.close.bind(dialog);
    dialog.close = (returnValue?: string) => {
      const easing = "cubic-bezier(0.32, 0, 0.67, 0)";
      const duration = 100;
      dialog.animate(
        {
          opacity: [1, 0],
          transform: ["translateY(0) scale(1)", "translateY(-12px) scale(0.98)"]
        },
        { duration, easing }
      );
      dialog
        .animate({ opacity: [1, 0] }, { duration, easing, pseudoElement: "::backdrop" })
        .finished.then(() => nativeClose(returnValue));
    };
  });

  // Load pagefind when the modal opens
  useVisibleTask$(async ({ track }) => {
    const open = track(() => isOpen.value);
    if (!open || globalThis.__pagefind) return;

    try {
      const path = "/pagefind/pagefind.js";
      globalThis.__pagefind = await import(path);
    } catch {
      // pagefind not available (dev mode before first build)
    }
  });

  // Search when query changes
  useVisibleTask$(async ({ track }) => {
    const q = track(() => query.value);

    if (!q.trim()) {
      results.value = undefined;
      return;
    }

    if (!globalThis.__pagefind) return;

    const search = await globalThis.__pagefind.search(q);
    const loaded: SearchResult[] = await Promise.all(
      search.results.slice(0, 20).map((r) => r.data())
    );
    results.value = loaded;
  });

  useOnDocument(
    "keydown",
    $((e: Event) => {
      // SearchModal is rendered more than once (desktop sidebar + mobile drawer),
      // so every instance registers this listener and they all receive the very
      // same KeyboardEvent object. Stamping it lets only the first one act -
      // otherwise the extra clicks would toggle the modal straight back closed.
      const event = e as KeyboardEvent & { searchShortcutHandled?: boolean };
      if (event.searchShortcutHandled) return;
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.searchShortcutHandled = true;
        event.preventDefault();
        const trigger = document.querySelector(
          "[data-search-trigger]"
        ) as HTMLButtonElement | null;
        trigger?.click();
      }
    })
  );

  const preventArrowScroll$ = sync$((e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
    }
  });

  const handleKeyDown$ = $((e: KeyboardEvent) => {
    const links = listRef.value?.querySelectorAll<HTMLAnchorElement>(".search-result");
    const count = links?.length ?? 0;
    if (!count) return;

    if (e.key === "ArrowDown") {
      activeIndex.value = (activeIndex.value + 1) % count;
    } else if (e.key === "ArrowUp") {
      activeIndex.value = (activeIndex.value - 1 + count) % count;
    } else if (e.key === "Enter" && activeIndex.value >= 0) {
      links?.[activeIndex.value]?.click();
      return;
    } else {
      return;
    }

    if (links) {
      for (const link of links) link.classList.remove("search-result-active");
    }
    links?.[activeIndex.value]?.classList.add("search-result-active");
    links?.[activeIndex.value]?.scrollIntoView({ block: "nearest" });
  });

  const displayResults = results.value;
  const hasQuery = query.value.trim().length > 0;

  return (
    <modal.root bind:open={isOpen}>
      <modal.trigger class="search-trigger" data-search-trigger>
        <span>Quick Search</span>
        <kbd>&#8984;K</kbd>
      </modal.trigger>

      <modal.content class="search-dialog">
        <div class="search-dialog-inner">
          <modal.title class="search-header">
            <svg
              class="search-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              class="search-input"
              placeholder="Search documentation..."
              bind:value={query}
              onKeyDown$={[preventArrowScroll$, handleKeyDown$]}
              onInput$={() => {
                activeIndex.value = -1;
              }}
            />
            <modal.close class="search-esc">ESC</modal.close>
          </modal.title>

          <div class="search-results">
            <div class="search-results-label">Results</div>
            <div ref={listRef} class="search-results-list">
              {hasQuery && displayResults ? (
                displayResults.length > 0 ? (
                  displayResults.map((r) => (
                    <a key={r.url} href={r.url} class="search-result">
                      <div class="search-result-icon">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        </svg>
                      </div>
                      <div class="search-result-text">
                        <div class="search-result-title">{r.meta?.title ?? r.url}</div>
                        <p
                          class="search-result-desc"
                          dangerouslySetInnerHTML={r.excerpt}
                        />
                      </div>
                      <svg
                        class="search-result-chevron"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </a>
                  ))
                ) : (
                  <div class="search-no-results">
                    No results found for "{query.value}"
                  </div>
                )
              ) : (
                navItems.map((item) => (
                  <a key={item.href} href={item.href} class="search-result">
                    <div class="search-result-icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={item.icon}
                      />
                    </div>
                    <div class="search-result-text">
                      <div class="search-result-title">{item.label}</div>
                      <p class="search-result-desc">{item.description}</p>
                    </div>
                    <svg
                      class="search-result-chevron"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </a>
                ))
              )}
            </div>
          </div>

          <div class="search-footer">
            <div class="search-footer-count">
              {hasQuery && displayResults
                ? `${displayResults.length} result${displayResults.length !== 1 ? "s" : ""} found`
                : `${navItems.length} results found`}
            </div>
          </div>
        </div>
      </modal.content>
    </modal.root>
  );
});
