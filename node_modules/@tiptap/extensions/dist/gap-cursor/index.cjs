Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _tiptap_core = require("@tiptap/core");
let _tiptap_pm_gapcursor = require("@tiptap/pm/gapcursor");
//#region src/gap-cursor/gap-cursor.ts
/**
* This extension allows you to add a gap cursor to your editor.
* A gap cursor is a cursor that appears when you click on a place
* where no content is present, for example inbetween nodes.
* @see https://tiptap.dev/api/extensions/gapcursor
*/
const Gapcursor = _tiptap_core.Extension.create({
	name: "gapCursor",
	addProseMirrorPlugins() {
		return [(0, _tiptap_pm_gapcursor.gapCursor)()];
	},
	extendNodeSchema(extension) {
		var _callOrReturn;
		const context = {
			name: extension.name,
			options: extension.options,
			storage: extension.storage
		};
		return { allowGapCursor: (_callOrReturn = (0, _tiptap_core.callOrReturn)((0, _tiptap_core.getExtensionField)(extension, "allowGapCursor", context))) !== null && _callOrReturn !== void 0 ? _callOrReturn : null };
	}
});
//#endregion
exports.Gapcursor = Gapcursor;

//# sourceMappingURL=index.cjs.map