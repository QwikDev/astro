import { $, component$, useId, useStyles$ } from "@qwik.dev/core";
import styles from "./theme-toggle.css?inline";

export const ThemeToggle = component$(() => {
  useStyles$(styles);
  const maskId = useId();

  const onClick$ = $(() => {
    const theme = document.documentElement.className;
    if (theme === "light") {
      document.documentElement.className = "dark";
      localStorage.setItem("darkMode", "dark");
    } else {
      document.documentElement.className = "light";
      localStorage.setItem("darkMode", "light");
    }
  });

  return (
    <button
      type="button"
      class="theme-toggle"
      title="Toggle light & dark"
      aria-label="Toggle light & dark"
      aria-live="polite"
      onClick$={onClick$}
    >
      <svg
        class="sun-and-moon"
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <mask class="moon" id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle cx="24" cy="10" r="6" fill="black" />
        </mask>
        <circle
          class="sun"
          cx="12"
          cy="12"
          r="6"
          mask={`url(#${maskId})`}
          fill="currentColor"
        />
        <g class="sun-beams" stroke="currentColor">
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
    </button>
  );
});
