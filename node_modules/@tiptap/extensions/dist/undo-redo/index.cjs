Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _tiptap_core = require("@tiptap/core");
let _tiptap_pm_history = require("@tiptap/pm/history");
//#region src/undo-redo/undo-redo.ts
/**
* This extension allows you to undo and redo recent changes.
* @see https://www.tiptap.dev/api/extensions/undo-redo
*
* **Important**: If the `@tiptap/extension-collaboration` package is used, make sure to remove
* the `undo-redo` extension, as it is not compatible with the `collaboration` extension.
*
* `@tiptap/extension-collaboration` uses its own history implementation.
*/
const UndoRedo = _tiptap_core.Extension.create({
	name: "undoRedo",
	addOptions() {
		return {
			depth: 100,
			newGroupDelay: 500
		};
	},
	addCommands() {
		return {
			undo: () => ({ state, dispatch }) => {
				return (0, _tiptap_pm_history.undo)(state, dispatch);
			},
			redo: () => ({ state, dispatch }) => {
				return (0, _tiptap_pm_history.redo)(state, dispatch);
			}
		};
	},
	addProseMirrorPlugins() {
		return [(0, _tiptap_pm_history.history)(this.options)];
	},
	addKeyboardShortcuts() {
		return {
			"Mod-z": () => this.editor.commands.undo(),
			"Shift-Mod-z": () => this.editor.commands.redo(),
			"Mod-y": () => this.editor.commands.redo(),
			"Mod-я": () => this.editor.commands.undo(),
			"Shift-Mod-я": () => this.editor.commands.redo()
		};
	}
});
//#endregion
exports.UndoRedo = UndoRedo;

//# sourceMappingURL=index.cjs.map