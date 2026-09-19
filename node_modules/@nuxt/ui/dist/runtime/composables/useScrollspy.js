import { ref, watch, onBeforeMount, onBeforeUnmount } from "vue";
export function useScrollspy() {
  const observer = ref();
  const visibleHeadings = ref([]);
  const activeHeadings = ref([]);
  function observerCallback(entries) {
    const headings = new Set(visibleHeadings.value);
    let changed = false;
    for (const entry of entries) {
      const id = entry.target.id;
      if (!id) {
        continue;
      }
      if (entry.isIntersecting) {
        if (!headings.has(id)) {
          headings.add(id);
          changed = true;
        }
      } else if (headings.delete(id)) {
        changed = true;
      }
    }
    if (changed) {
      visibleHeadings.value = [...headings];
    }
  }
  function updateHeadings(headings) {
    if (!observer.value) {
      return;
    }
    observer.value.disconnect();
    visibleHeadings.value = [];
    headings.forEach((heading) => observer.value.observe(heading));
  }
  watch(visibleHeadings, (val, oldVal) => {
    if (val.length === 0) {
      activeHeadings.value = oldVal;
    } else {
      activeHeadings.value = val;
    }
  });
  onBeforeMount(() => observer.value = new IntersectionObserver(observerCallback));
  onBeforeUnmount(() => observer.value?.disconnect());
  return {
    visibleHeadings,
    activeHeadings,
    updateHeadings
  };
}
