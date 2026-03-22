/**
 * ClientRouter support for Qwik + Astro.
 * Handles container lifecycle across Astro page transitions.
 */

window.addEventListener("error", function (e) {
  if (
    e.message &&
    (e.message.indexOf("replaceWith") !== -1 ||
      e.message.indexOf("has already been declared") !== -1)
  ) {
    e.preventDefault();
  }
});

window.addEventListener("unhandledrejection", function (e) {
  if (e.reason && e.reason.message && e.reason.message.indexOf("replaceWith") !== -1) {
    e.preventDefault();
  }
});

document.addEventListener("astro:after-preparation", function () {
  document.querySelectorAll("[q\\:container]").forEach(function (e) {
    if (e.qDestroy) {
      e.qDestroy();
    }
  });
});

document.addEventListener("astro:after-swap", function () {
  // Clear so new containers call processVNodeData
  document.qVNodeData = undefined;
  var o = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        o.unobserve(entry.target);
        entry.target.dispatchEvent(new CustomEvent("qvisible", { detail: entry }));
      }
    });
  });

  document.querySelectorAll("[q-e\\:qvisible]:not([q\\:observed])").forEach(function (e) {
    o.observe(e);
    e.setAttribute("q:observed", "true");
  });
});
