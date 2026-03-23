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

document.addEventListener("astro:before-swap", function () {
  document.querySelectorAll("[q\\:container]").forEach(function (e) {
    if (e.qDestroy) {
      e.qDestroy();
    }
  });
  document.qVNodeData = undefined;
});

document.addEventListener("astro:after-swap", function () {
  // Re-trigger qwikloader's processReadyStateChange to observe new qvisible
  // elements using its native IntersectionObserver after page swap.
  if (window._qwikEv && window._qwikEv.push) {
    window._qwikEv.push("e:qvisible");
  }
  document.dispatchEvent(new Event("readystatechange"));
});
