import { modal } from "@qds.dev/ui";
import {
  $,
  component$,
  sync$,
  useOnDocument,
  useSignal,
  useStyles$,
  useVisibleTask$,
} from "@qwik.dev/core";
import { navItems } from "../nav-items";
import styles from "./search-modal.css?inline";

export const SearchModal = component$(() => {
  useStyles$(styles);

  const activeIndex = useSignal(-1);
  const listRef = useSignal<HTMLDivElement>();

  useOnDocument(
    "keydown",
    $((e: Event) => {
      const event = e as KeyboardEvent;
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        const trigger = document.querySelector(
          "[data-search-trigger]",
        ) as HTMLButtonElement | null;
        trigger?.click();
      }
    }),
  );

  const preventArrowScroll$ = sync$((e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
    }
  });

  const handleKeyDown$ = $((e: KeyboardEvent) => {
    const links =
      listRef.value?.querySelectorAll<HTMLAnchorElement>(".search-result");
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

  useVisibleTask$(() => {
    console.log("HEY");
  });

  return (
    <modal.root>
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
              data-search-input
              placeholder="Search documentation..."
              onKeyDown$={[preventArrowScroll$, handleKeyDown$]}
              onInput$={() => {
                activeIndex.value = -1;
              }}
            />
            <modal.close class="search-esc">ESC</modal.close>
          </modal.title>

          <div class="search-results">
            <div class="search-results-label">Results</div>
            <div ref={listRef} class="search-results-list" data-search-results>
              {navItems.map((item) => (
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
              ))}
            </div>
          </div>

          <div class="search-footer">
            <div class="search-footer-count" data-search-count>
              {navItems.length} results found
            </div>
          </div>
        </div>
      </modal.content>
    </modal.root>
  );
});
