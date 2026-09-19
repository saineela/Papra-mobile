import { Extension } from "@tiptap/core";
import { dropCursor } from "@tiptap/pm/dropcursor";
//#region src/drop-cursor/drop-cursor.ts
/**
* This extension allows you to add a drop cursor to your editor.
* A drop cursor is a line that appears when you drag and drop content
* in-between nodes.
* @see https://tiptap.dev/api/extensions/dropcursor
*/
const Dropcursor = Extension.create({
	name: "dropCursor",
	addOptions() {
		return {
			color: "currentColor",
			width: 1,
			class: void 0
		};
	},
	addProseMirrorPlugins() {
		return [dropCursor(this.options)];
	}
});
//#endregion
export { Dropcursor };

//# sourceMappingURL=index.js.map