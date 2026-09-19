Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _tiptap_core = require("@tiptap/core");
let _tiptap_pm_dropcursor = require("@tiptap/pm/dropcursor");
//#region src/drop-cursor/drop-cursor.ts
/**
* This extension allows you to add a drop cursor to your editor.
* A drop cursor is a line that appears when you drag and drop content
* in-between nodes.
* @see https://tiptap.dev/api/extensions/dropcursor
*/
const Dropcursor = _tiptap_core.Extension.create({
	name: "dropCursor",
	addOptions() {
		return {
			color: "currentColor",
			width: 1,
			class: void 0
		};
	},
	addProseMirrorPlugins() {
		return [(0, _tiptap_pm_dropcursor.dropCursor)(this.options)];
	}
});
//#endregion
exports.Dropcursor = Dropcursor;

//# sourceMappingURL=index.cjs.map