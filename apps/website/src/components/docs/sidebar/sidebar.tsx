import { component$, useStyles$ } from "@qwik.dev/core";
import { navItems } from "../nav-items";
import { SearchModal } from "../search/search-modal";
import styles from "./sidebar.css?inline";

export const Sidebar = component$<{
  currentPath: string;
  version: string;
}>(({ currentPath, version }) => {
  useStyles$(styles);

  return (
    <aside class="sidebar">
      <a href="/" class="sidebar-header">
        <img
          src="/qwik-v2-logo.svg"
          alt="Qwik Astro"
          width="36"
          height="41"
          class="sidebar-logo"
        />
        <div class="sidebar-header-text">
          <span class="sidebar-title">Qwik + Astro</span>
          <span class="sidebar-version">v{version}</span>
        </div>
      </a>

      <SearchModal />

      <nav class="sidebar-nav">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            class={`sidebar-link${currentPath === item.href ? " active" : ""}`}
          >
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
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div class="sidebar-footer">
        <a
          href="https://github.com/QwikDev/astro"
          target="_blank"
          rel="noreferrer noopener"
          class="sidebar-external"
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
        <a
          href="https://discord.com/channels/842438759945601056/1150941080355881080"
          target="_blank"
          rel="noreferrer noopener"
          class="sidebar-external"
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
          <span>Discord</span>
        </a>
      </div>
    </aside>
  );
});
