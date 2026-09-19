import { usePage } from "@inertiajs/vue3";
export * from "./base.js";
export const useRoute = () => {
  const page = usePage();
  return {
    get fullPath() {
      return page.url;
    }
  };
};
export const useRouter = () => {
};
