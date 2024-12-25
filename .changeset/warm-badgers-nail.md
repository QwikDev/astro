---
"@qwikdev/astro": minor
---

### ✨ What's New

- 🚀 Added support for Astro 5
- 🔄 Integrated Qwik's next-gen buffering system (First framework to support this!)
- 📚 Added support for Qwik libraries
- 🔍 New debug mode: `{ debug: true }`
- 💨 Switched to `renderToStream` for better performance
- 🧩 Improved inline Qwik components support ([#158](https://github.com/QwikDev/astro/issues/158))

### 🛠️ Under the Hood

- ⚡️ Faster builds: Now using Vite for entrypoint detection
- 🪟 Fixed Windows compatibility issues
- 📁 Better `@astrojs/mdx` compatibility
- 📁 A temp directory is no longer needed
- 🌐 Full support for all deployment platforms ([#179](https://github.com/QwikDev/astro/issues/179)):
  - Netlify
  - Vercel
  - Cloudflare
  - And more!

### 📦 Package Cleanup

- Removed unnecessary dependencies:
  - `fs-extra`
  - `fs-move`
  - `vite-tsconfig-paths`
- Simplified peer dependencies to `@builder.io/qwik >= 1.9.0`
- Fixed missing dependencies ([#161](https://github.com/QwikDev/astro/issues/161))
- Better respect for Astro config options ([#74](https://github.com/QwikDev/astro/issues/74), [#172](https://github.com/QwikDev/astro/issues/172))