/// <reference types="astro/client" />

declare module "/pagefind/pagefind.js" {
  export function search(query: string): Promise<{
    results: Array<{
      data(): Promise<{
        url: string;
        excerpt: string;
        meta?: { title?: string };
      }>;
    }>;
  }>;
}
