import { addPointerInfo } from "./event-info.mjs";
import { addDomEvent } from "motion-dom";
function addPointerEvent(target, eventName, handler, options) {
	return addDomEvent(target, eventName, addPointerInfo(handler), options);
}
export { addPointerEvent };
