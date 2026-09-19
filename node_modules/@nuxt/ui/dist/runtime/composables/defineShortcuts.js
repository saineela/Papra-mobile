import { ref, computed, toValue } from "vue";
import { useEventListener, useActiveElement, useDebounceFn, useTimeoutFn } from "@vueuse/core";
import { useKbd } from "./useKbd.js";
const chainedShortcutRegex = /^[^-]+.*-.*[^-]+$/;
const combinedShortcutRegex = /^[^_]+.*_.*[^_]+$/;
const shiftableKeys = ["arrowleft", "arrowright", "arrowup", "arrowdown", "tab", "escape", "enter", "backspace"];
function convertKeyToCode(key) {
  if (/^[a-z]$/i.test(key)) {
    return `Key${key.toUpperCase()}`;
  }
  if (/^\d$/.test(key)) {
    return `Digit${key}`;
  }
  if (/^f\d+$/i.test(key)) {
    return key.toUpperCase();
  }
  const specialKeys = {
    space: "Space",
    enter: "Enter",
    escape: "Escape",
    tab: "Tab",
    backspace: "Backspace",
    delete: "Delete",
    arrowup: "ArrowUp",
    arrowdown: "ArrowDown",
    arrowleft: "ArrowLeft",
    arrowright: "ArrowRight"
  };
  return specialKeys[key.toLowerCase()] || key;
}
export function extractShortcuts(items, separator = "_") {
  const shortcuts = {};
  function traverse(items2) {
    items2.forEach((item) => {
      if (item.kbds?.length && (item.onSelect || item.onClick)) {
        const shortcutKey = item.kbds.join(separator);
        shortcuts[shortcutKey] = item.onSelect || item.onClick;
      }
      if (item.children) {
        traverse(item.children.flat());
      }
      if (item.items) {
        traverse(item.items.flat());
      }
    });
  }
  traverse(items.flat());
  return shortcuts;
}
export function defineShortcuts(config, options = {}) {
  const chainDelay = options.chainDelay ?? 800;
  const chainedInputs = ref([]);
  const clearChainedInput = () => {
    chainedInputs.value.splice(0, chainedInputs.value.length);
  };
  const debouncedClearChainedInput = useDebounceFn(clearChainedInput, chainDelay);
  let pendingShortcut;
  const cancelPendingShortcut = () => {
    pendingShortcut = void 0;
    pendingTimer.stop();
  };
  const runPendingShortcut = () => {
    const pending = pendingShortcut;
    cancelPendingShortcut();
    if (!pending) {
      return;
    }
    const shortcut = standardShortcuts.value.find((s) => s.key === pending.shortcut.key && !s.metaKey && !s.ctrlKey && !s.altKey && !s.shiftKey);
    if (shortcut?.enabled) {
      shortcut.handler(pending.event);
    }
  };
  const pendingTimer = useTimeoutFn(() => {
    runPendingShortcut();
    clearChainedInput();
  }, chainDelay, { immediate: false });
  const { macOS } = useKbd();
  const activeElement = useActiveElement();
  const layoutIndependent = options.layoutIndependent ?? false;
  const shiftableCodes = shiftableKeys.map((k) => convertKeyToCode(k));
  const onKeyDown = (e) => {
    if (!e.key) {
      return;
    }
    const useCode = layoutIndependent || e.altKey;
    const alphabetKey = useCode ? /^Key[A-Z]$/i.test(e.code) : /^[a-z]{1}$/i.test(e.key);
    const shiftableKey = useCode ? shiftableCodes.includes(e.code) : shiftableKeys.includes(e.key.toLowerCase());
    let chainedKey;
    chainedInputs.value.push(layoutIndependent ? e.code : e.key);
    if (chainedInputs.value.length >= 2) {
      chainedKey = chainedInputs.value.slice(-2).join("-");
      for (const shortcut of chainedShortcuts.value) {
        if (shortcut.key !== chainedKey) {
          continue;
        }
        if (shortcut.enabled) {
          cancelPendingShortcut();
          e.preventDefault();
          shortcut.handler(e);
        } else {
          runPendingShortcut();
        }
        clearChainedInput();
        return;
      }
    }
    runPendingShortcut();
    for (const shortcut of standardShortcuts.value) {
      if (layoutIndependent) {
        if (e.code !== shortcut.key) {
          continue;
        }
      } else if (shortcut.altKey && e.altKey) {
        if (e.code !== convertKeyToCode(shortcut.key)) {
          continue;
        }
      } else {
        if (e.key.toLowerCase() !== shortcut.key) {
          continue;
        }
      }
      if (e.metaKey !== shortcut.metaKey) {
        continue;
      }
      if (e.ctrlKey !== shortcut.ctrlKey) {
        continue;
      }
      if (e.altKey !== shortcut.altKey) {
        continue;
      }
      if ((alphabetKey || shiftableKey || shortcut.shiftKey || e.shiftKey && (e.metaKey || e.ctrlKey)) && e.shiftKey !== shortcut.shiftKey) {
        continue;
      }
      const isUnmodified = !shortcut.metaKey && !shortcut.ctrlKey && !shortcut.altKey && !shortcut.shiftKey;
      if (isUnmodified && chainPrefixes.value.has(shortcut.key)) {
        if (shortcut.enabled) {
          e.preventDefault();
        }
        pendingShortcut = { shortcut, event: e };
        pendingTimer.start();
        return;
      }
      if (shortcut.enabled) {
        e.preventDefault();
        shortcut.handler(e);
      }
      clearChainedInput();
      return;
    }
    debouncedClearChainedInput();
  };
  const usingInput = computed(() => {
    const tagName = activeElement.value?.tagName;
    const contentEditable = activeElement.value?.contentEditable;
    const usingInput2 = !!(tagName === "INPUT" || tagName === "TEXTAREA" || contentEditable === "true" || contentEditable === "plaintext-only");
    if (usingInput2) {
      return activeElement.value?.name || true;
    }
    return false;
  });
  const shortcuts = computed(() => {
    return Object.entries(toValue(config)).map(([key, shortcutConfig]) => {
      if (!shortcutConfig) {
        return null;
      }
      let shortcut;
      if (key.includes("-") && key !== "-" && !key.includes("_") && !key.match(chainedShortcutRegex)?.length) {
        console.trace(`[Shortcut] Invalid key: "${key}"`);
      }
      if (key.includes("_") && key !== "_" && !key.match(combinedShortcutRegex)?.length) {
        console.trace(`[Shortcut] Invalid key: "${key}"`);
      }
      const chained = key.includes("-") && key !== "-" && !key.includes("_");
      if (chained) {
        if (layoutIndependent) {
          const parts = key.split("-").map((p) => convertKeyToCode(p));
          shortcut = {
            key: parts.join("-"),
            metaKey: false,
            ctrlKey: false,
            shiftKey: false,
            altKey: false
          };
        } else {
          shortcut = {
            key: key.toLowerCase(),
            metaKey: false,
            ctrlKey: false,
            shiftKey: false,
            altKey: false
          };
        }
      } else {
        const keySplit = key.toLowerCase().split("_").map((k) => k);
        let baseKey = keySplit.filter((k) => !["meta", "command", "ctrl", "shift", "alt", "option"].includes(k)).join("_");
        if (layoutIndependent) {
          baseKey = convertKeyToCode(baseKey);
        }
        shortcut = {
          key: baseKey,
          metaKey: keySplit.includes("meta") || keySplit.includes("command"),
          ctrlKey: keySplit.includes("ctrl"),
          shiftKey: keySplit.includes("shift"),
          altKey: keySplit.includes("alt") || keySplit.includes("option")
        };
      }
      shortcut.chained = chained;
      if (!macOS.value && shortcut.metaKey && !shortcut.ctrlKey) {
        shortcut.metaKey = false;
        shortcut.ctrlKey = true;
      }
      if (typeof shortcutConfig === "function") {
        shortcut.handler = shortcutConfig;
      } else if (typeof shortcutConfig === "object") {
        shortcut = { ...shortcut, handler: shortcutConfig.handler };
      }
      if (!shortcut.handler) {
        console.trace("[Shortcut] Invalid value");
        return null;
      }
      let enabled = true;
      if (!shortcutConfig.usingInput) {
        enabled = !usingInput.value;
      } else if (typeof shortcutConfig.usingInput === "string") {
        enabled = usingInput.value === shortcutConfig.usingInput;
      }
      shortcut.enabled = enabled;
      return shortcut;
    }).filter(Boolean);
  });
  const chainedShortcuts = computed(() => shortcuts.value.filter((s) => s.chained));
  const standardShortcuts = computed(() => shortcuts.value.filter((s) => !s.chained));
  const chainPrefixes = computed(() => new Set(chainedShortcuts.value.map((s) => s.key.split("-")[0])));
  return useEventListener("keydown", onKeyDown);
}
