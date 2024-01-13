(() => {
  const DIRECT_PRIORITY = Number.MAX_SAFE_INTEGER >>> 1;
  function directFetch(swState, url) {
    const [basePath, filename] = parseBaseFilename(url);
    const base = swState.$bases$.find((base2) => basePath === base2.$path$);
    if (base) {
      swState.$log$("intercepting", url.pathname);
      return enqueueFileAndDependencies(
        swState,
        base,
        [filename],
        DIRECT_PRIORITY
      ).then(() =>
        (async function (swState, url) {
          const currentRequestTask = swState.$queue$.find(
            (task) => task.$url$.pathname === url.pathname
          );
          if (currentRequestTask) {
            return currentRequestTask.$response$;
          }
          swState.$log$("CACHE HIT", url.pathname);
          return swState.$cache$.match(url);
        })(swState, url)
      );
    }
  }
  async function enqueueFileAndDependencies(
    swState,
    base,
    filenames,
    priority
  ) {
    const fetchSet = new Set();
    filenames.forEach((filename) =>
      addDependencies(base.$graph$, fetchSet, filename)
    );
    await Promise.all(
      Array.from(fetchSet).map((filename) =>
        (async function (swState, url, priority) {
          let task = swState.$queue$.find(
            (task2) => task2.$url$.pathname === url.pathname
          );
          const mode = priority >= DIRECT_PRIORITY ? "direct" : "prefetch";
          if (task) {
            const state = task.$isFetching$ ? "fetching" : "waiting";
            if (task.$priority$ < priority) {
              swState.$log$("queue update priority", state, url.pathname);
              task.$priority$ = priority;
            } else {
              swState.$log$("already in queue", mode, state, url.pathname);
            }
          } else {
            if (!(await swState.$cache$.match(url))) {
              swState.$log$("enqueue", mode, url.pathname);
              task = {
                $priority$: priority,
                $url$: url,
                $resolveResponse$: null,
                $response$: null,
                $isFetching$: !1,
              };
              task.$response$ = new Promise(
                (resolve) => (task.$resolveResponse$ = resolve)
              );
              swState.$queue$.push(task);
            }
          }
          return task;
        })(swState, new URL(base.$path$ + filename, swState.$url$), priority)
      )
    );
    taskTick(swState);
  }
  function taskTick(swState) {
    swState.$queue$.sort(byFetchOrder);
    let outstandingRequests = 0;
    for (const task of swState.$queue$) {
      if (task.$isFetching$) {
        outstandingRequests++;
      } else if (
        outstandingRequests < swState.$maxPrefetchRequests$ ||
        task.$priority$ >= DIRECT_PRIORITY
      ) {
        task.$isFetching$ = !0;
        outstandingRequests++;
        const action =
          task.$priority$ >= DIRECT_PRIORITY ? "FETCH (CACHE MISS)" : "FETCH";
        swState.$log$(action, task.$url$.pathname);
        swState
          .$fetch$(task.$url$)
          .then(async (response) => {
            if (200 === response.status) {
              swState.$log$("CACHED", task.$url$.pathname);
              await swState.$cache$.put(task.$url$, response.clone());
            }
            task.$resolveResponse$(response);
          })
          .finally(() => {
            swState.$log$("FETCH DONE", task.$url$.pathname);
            swState.$queue$.splice(swState.$queue$.indexOf(task), 1);
            taskTick(swState);
          });
      }
    }
  }
  function byFetchOrder(a, b) {
    return b.$priority$ - a.$priority$;
  }
  function addDependencies(graph, fetchSet, filename) {
    if (!fetchSet.has(filename)) {
      fetchSet.add(filename);
      let index = graph.findIndex((file) => file === filename);
      if (-1 !== index) {
        while ("number" == typeof graph[++index]) {
          addDependencies(graph, fetchSet, graph[graph[index]]);
        }
      }
    }
    return fetchSet;
  }
  function parseBaseFilename(url) {
    const pathname = new URL(url).pathname;
    const slashIndex = pathname.lastIndexOf("/");
    return [
      pathname.substring(0, slashIndex + 1),
      pathname.substring(slashIndex + 1),
    ];
  }
  const log = (...args) => {
    console.log("⚙️ Prefetch SW:", ...args);
  };
  const processMessage = async (state, msg) => {
    const type = msg[0];
    state.$log$("received message:", type, msg[1], msg.slice(2));
    "graph" === type
      ? await processBundleGraph(state, msg[1], msg.slice(2), !0)
      : "graph-url" === type
      ? await (async function (swState, base, graphPath) {
          await processBundleGraph(swState, base, [], !1);
          const response = await directFetch(
            swState,
            new URL(base + graphPath, swState.$url$)
          );
          if (response && 200 === response.status) {
            const graph = await response.json();
            graph.push(graphPath);
            await processBundleGraph(swState, base, graph, !0);
          }
        })(state, msg[1], msg[2])
      : "prefetch" === type
      ? await processPrefetch(state, msg[1], msg.slice(2))
      : "prefetch-all" === type
      ? await (function (swState, basePath) {
          const base = swState.$bases$.find(
            (base2) => basePath === base2.$path$
          );
          base
            ? processPrefetch(
                swState,
                basePath,
                base.$graph$.filter((item) => "string" == typeof item)
              )
            : console.error(
                `Base path not found: ${basePath}, ignoring prefetch.`
              );
        })(state, msg[1])
      : "ping" === type
      ? log("ping")
      : "verbose" === type
      ? (state.$log$ = log)("mode: verbose")
      : console.error("UNKNOWN MESSAGE:", msg);
  };
  async function processBundleGraph(swState, base, graph, cleanup) {
    const existingBaseIndex = swState.$bases$.findIndex(
      (base2) => base2 == base2
    );
    -1 !== existingBaseIndex && swState.$bases$.splice(existingBaseIndex, 1);
    swState.$log$("adding base:", base);
    swState.$bases$.push({
      $path$: base,
      $graph$: graph,
    });
    if (cleanup) {
      const bundles = new Set(graph.filter((item) => "string" == typeof item));
      for (const request of await swState.$cache$.keys()) {
        const [cacheBase, filename] = parseBaseFilename(new URL(request.url));
        const promises = [];
        if (cacheBase === base && !bundles.has(filename)) {
          swState.$log$("deleting", request.url);
          promises.push(swState.$cache$.delete(request));
        }
        await Promise.all(promises);
      }
    }
  }
  function processPrefetch(swState, basePath, bundles) {
    const base = swState.$bases$.find((base2) => basePath === base2.$path$);
    base
      ? enqueueFileAndDependencies(swState, base, bundles, 0)
      : console.error(`Base path not found: ${basePath}, ignoring prefetch.`);
  }
  function drainMsgQueue(swState) {
    if (!swState.$msgQueuePromise$ && swState.$msgQueue$.length) {
      const top = swState.$msgQueue$.shift();
      swState.$msgQueuePromise$ = processMessage(swState, top).then(() => {
        swState.$msgQueuePromise$ = null;
        drainMsgQueue(swState);
      });
    }
  }
  ((swScope) => {
    const swState = ((fetch, url) => ({
      $fetch$: fetch,
      $queue$: [],
      $bases$: [],
      $cache$: null,
      $msgQueue$: [],
      $msgQueuePromise$: null,
      $maxPrefetchRequests$: 10,
      $url$: url,
      $log$: (...args) => {},
    }))(swScope.fetch.bind(swScope), new URL(swScope.location.href));
    swScope.addEventListener("fetch", async (ev) => {
      const request = ev.request;
      if ("GET" === request.method) {
        const response = directFetch(swState, new URL(request.url));
        response && ev.respondWith(response);
      }
    });
    swScope.addEventListener("message", (ev) => {
      swState.$msgQueue$.push(ev.data);
      drainMsgQueue(swState);
    });
    swScope.addEventListener("install", () => swScope.skipWaiting());
    swScope.addEventListener("activate", async (event) => {
      event.waitUntil(swScope.clients.claim());
      swState.$cache$ = await swScope.caches.open("QwikBundles");
    });
  })(globalThis);
})();
