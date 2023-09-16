/* LEAVING HERE FOR NOW SO IT WORKS 

We've kept a blank root.tsx in **astro-demo** and then added a root.tsx inside the integration, and it seems to be using the one inside of **astrojs-qwik** now suppressing the error.

Giorgio mentioned that the framework needs to compose a path but is making the wrong assumption with Astro.

Inside of **optimizer.mjs** we get the following error
```
throw new Error(`Qwik input "${input}" not found.`);
```

function that gives the error:
```tsx
const validateSource = async resolver => {
    if (!hasValidatedSource) {
      hasValidatedSource = true;
      const sys = getSys();
      if ("node" === sys.env) {
        const fs = await sys.dynamicImport("node:fs");
        if (!fs.existsSync(opts.rootDir)) {
          throw new Error(`Qwik rootDir "${opts.rootDir}" not found.`);
        }
        if ("string" === typeof opts.srcDir && !fs.existsSync(opts.srcDir)) {
          throw new Error(`Qwik srcDir "${opts.srcDir}" not found.`);
        }
        for (const alias in opts.input) {
          const input = opts.input[alias];
          const resolved = await resolver(input);
          if (!resolved) {
            throw new Error(`Qwik input "${input}" not found.`);
          }
        }
      }
    }
  };
```

*/
