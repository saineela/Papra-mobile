import { createTV, cnMerge } from "tailwind-variants";
import appConfig from "#build/app.config";
const appConfigTv = appConfig;
const config = appConfigTv.ui?.tv;
const baseTv = /* @__PURE__ */ createTV(config);
function findReplacer(value) {
  if (typeof value === "function") {
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const replacer = findReplacer(value[i]);
      if (replacer) {
        return replacer;
      }
    }
  }
  return void 0;
}
function plainClasses(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => plainClasses(item));
  }
  if (typeof value === "function") {
    return [];
  }
  return [value];
}
function applyReplacer(replacer, slotProps, resolveDefaults) {
  return cnMerge(replacer(resolveDefaults()), ...plainClasses(slotProps.class), ...plainClasses(slotProps.className))(config) ?? "";
}
function isMemoizable(value, depth = 0) {
  if (value === void 0 || value === null) {
    return true;
  }
  const type = typeof value;
  if (type === "string" || type === "boolean") {
    return true;
  }
  if (type === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    if (depth >= 4) {
      return false;
    }
    for (const item of value) {
      if (!isMemoizable(item, depth + 1)) {
        return false;
      }
    }
    return true;
  }
  return false;
}
function memoKey(slotProps) {
  const proto = Object.getPrototypeOf(slotProps);
  if (proto !== Object.prototype && proto !== null) {
    return void 0;
  }
  for (const key of Object.keys(slotProps)) {
    if (!isMemoizable(slotProps[key])) {
      return void 0;
    }
  }
  return JSON.stringify(slotProps);
}
function wrapSlots(slots) {
  const memo = /* @__PURE__ */ new Map();
  return new Proxy(slots, {
    get(target, key) {
      const slot = target[key];
      if (typeof slot !== "function") {
        return slot;
      }
      return (slotProps = {}) => {
        const replacer = findReplacer(slotProps.class) ?? findReplacer(slotProps.className);
        if (!replacer) {
          const cacheKey = memoKey(slotProps);
          if (cacheKey === void 0) {
            return slot(slotProps);
          }
          let cache = memo.get(key);
          if (!cache) {
            cache = /* @__PURE__ */ new Map();
            memo.set(key, cache);
          }
          let result = cache.get(cacheKey);
          if (result === void 0 && !cache.has(cacheKey)) {
            if (cache.size >= 500) {
              cache.clear();
            }
            result = slot(slotProps);
            cache.set(cacheKey, result);
          }
          return result;
        }
        return applyReplacer(replacer, slotProps, () => slot({ ...slotProps, class: void 0, className: void 0 }));
      };
    }
  });
}
function defaultClasses(value) {
  return cnMerge(value)(config) ?? "";
}
function resolveReplacers(componentConfig) {
  if (!componentConfig || typeof componentConfig !== "object") {
    return componentConfig;
  }
  const slots = componentConfig.slots;
  const replacers = slots && typeof slots === "object" ? Object.entries(slots).filter((entry) => typeof entry[1] === "function") : [];
  const baseReplacer = typeof componentConfig.base === "function" ? componentConfig.base : void 0;
  if (!replacers.length && !baseReplacer) {
    return componentConfig;
  }
  const extend = componentConfig.extend;
  const resolved = { ...componentConfig };
  let extendSlots;
  let blankExtendBase = false;
  if (baseReplacer) {
    resolved.base = baseReplacer(defaultClasses(extend?.slots?.base ?? extend?.base));
    if (extend?.slots?.base) {
      extendSlots ??= { ...extend.slots };
      extendSlots.base = "";
    }
    if (extend?.base) {
      blankExtendBase = true;
    }
  }
  if (replacers.length) {
    const cleaned = { ...slots };
    for (const [slot, replacer] of replacers) {
      cleaned[slot] = replacer(defaultClasses(extend?.slots?.[slot]));
      if (extend?.slots?.[slot]) {
        extendSlots ??= { ...extend.slots };
        extendSlots[slot] = "";
      }
    }
    resolved.slots = cleaned;
  }
  if (extendSlots || blankExtendBase) {
    const cleanedExtend = { ...extend };
    if (extendSlots) {
      cleanedExtend.slots = extendSlots;
    }
    if (blankExtendBase) {
      cleanedExtend.base = "";
    }
    resolved.extend = cleanedExtend;
  }
  return resolved;
}
export const tv = ((componentConfig) => {
  const component = baseTv(resolveReplacers(componentConfig));
  return new Proxy(component, {
    apply(target, thisArg, args) {
      const result = Reflect.apply(target, thisArg, args);
      if (result && typeof result === "object") {
        return wrapSlots(result);
      }
      if (typeof result === "string") {
        const slotProps = args[0] ?? {};
        const replacer = findReplacer(slotProps.class) ?? findReplacer(slotProps.className);
        if (replacer) {
          return applyReplacer(replacer, slotProps, () => Reflect.apply(target, thisArg, [{ ...slotProps, class: void 0, className: void 0 }]));
        }
      }
      return result;
    }
  });
});
