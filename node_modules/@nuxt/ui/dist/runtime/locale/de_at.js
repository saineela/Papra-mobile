import { defineLocale } from "../composables/defineLocale.js";
import de from "./de.js";
export default defineLocale({
  name: "Deutsch (\xD6sterreich)",
  code: "de-AT",
  messages: de.messages
});
