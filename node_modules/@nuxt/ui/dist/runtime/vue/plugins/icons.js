import { addIcon } from "@iconify/vue";
import { init } from "virtual:nuxt-ui-icons";
export default {
  install() {
    init((name, data) => {
      const colon = name.indexOf(":");
      if (colon !== -1 && name.slice(0, colon).includes("-")) {
        addIcon(name.replace(":", "-"), data);
      }
      return addIcon(name, data);
    });
  }
};
