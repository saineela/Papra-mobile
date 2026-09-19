import { ref, nextTick, inject } from "vue";
import { useState } from "#imports";
export const toastMaxInjectionKey = Symbol("nuxt-ui.toast-max");
export function useToast() {
  const toasts = useState("toasts", () => []);
  const max = inject(toastMaxInjectionKey, void 0);
  const running = ref(false);
  const queue = [];
  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  function mergeDuplicate(index, toast) {
    toasts.value[index] = {
      ...toasts.value[index],
      ...toast,
      _duplicate: (toasts.value[index]._duplicate || 0) + 1
    };
  }
  async function processQueue() {
    if (running.value || queue.length === 0) {
      return;
    }
    running.value = true;
    while (queue.length > 0) {
      await nextTick();
      const toast = queue.shift();
      const maxValue = max?.value ?? 5;
      if (maxValue <= 0) {
        if (toasts.value.length) {
          toasts.value = [];
        }
        continue;
      }
      const existingIndex = toasts.value.findIndex((t) => t.id === toast.id);
      if (existingIndex !== -1) {
        mergeDuplicate(existingIndex, toast);
        continue;
      }
      toasts.value = [...toasts.value, toast].slice(-maxValue);
    }
    running.value = false;
  }
  function add(toast) {
    const body = {
      id: generateId(),
      open: true,
      ...toast
    };
    const existingIndex = toasts.value.findIndex((t) => t.id === body.id);
    if (existingIndex !== -1) {
      mergeDuplicate(existingIndex, body);
      return body;
    }
    queue.push(body);
    processQueue();
    return body;
  }
  function update(id, toast) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value[index] = {
        ...toasts.value[index],
        ...toast,
        duration: toast.duration,
        open: true,
        _updated: true
      };
      nextTick(() => {
        const i = toasts.value.findIndex((t) => t.id === id);
        if (i !== -1 && toasts.value[i]._updated) {
          toasts.value[i] = {
            ...toasts.value[i],
            _updated: void 0
          };
        }
      });
    }
  }
  function remove(id) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1 && toasts.value[index]._updated) {
      return;
    }
    if (index !== -1) {
      toasts.value[index] = {
        ...toasts.value[index],
        open: false
      };
    }
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 200);
  }
  function clear() {
    toasts.value = [];
  }
  return {
    toasts,
    add,
    update,
    remove,
    clear
  };
}
