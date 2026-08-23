---
"@qwik.dev/astro": patch
---

Fix entrypoint scanning on hosts without grep (e.g. Windows). The scanner now converts the project root URL to a filesystem path and falls back to a dependency-free Node directory walk when grep is unavailable, instead of silently finding no entrypoints and failing every prerendered page with Q14.
