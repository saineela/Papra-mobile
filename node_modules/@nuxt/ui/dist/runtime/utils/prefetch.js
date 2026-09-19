export function requestIdleCallback(callback) {
  if (typeof window === "undefined") {
    return;
  }
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback);
  }
  return setTimeout(callback, 1);
}
export function cancelIdleCallback(handle) {
  if (typeof window === "undefined" || handle === void 0) {
    return;
  }
  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(handle);
    return;
  }
  clearTimeout(handle);
}
let observer = null;
const callbacks = /* @__PURE__ */ new Map();
export function observeIntersection(element, callback) {
  if (typeof IntersectionObserver === "undefined") {
    return () => {
    };
  }
  observer ||= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const callback2 = callbacks.get(entry.target);
      if ((entry.isIntersecting || entry.intersectionRatio > 0) && callback2) {
        callback2();
      }
    }
  });
  callbacks.set(element, callback);
  observer.observe(element);
  return () => {
    callbacks.delete(element);
    observer?.unobserve(element);
    if (callbacks.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}
