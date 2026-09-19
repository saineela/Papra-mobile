Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _tiptap_core = require("@tiptap/core");
let _tiptap_pm_state = require("@tiptap/pm/state");
let _tiptap_pm_view = require("@tiptap/pm/view");
//#region src/focus/focus.ts
/**
* This extension allows you to add a class to the focused node.
* @see https://www.tiptap.dev/api/extensions/focus
*/
const Focus = _tiptap_core.Extension.create({
	name: "focus",
	addOptions() {
		return {
			className: "has-focus",
			mode: "all"
		};
	},
	addProseMirrorPlugins() {
		return [new _tiptap_pm_state.Plugin({
			key: new _tiptap_pm_state.PluginKey("focus"),
			props: { decorations: ({ doc, selection }) => {
				const { isEditable, isFocused } = this.editor;
				const { anchor } = selection;
				const decorations = [];
				if (!isEditable || !isFocused) return _tiptap_pm_view.DecorationSet.create(doc, []);
				let maxLevels = 0;
				if (this.options.mode === "deepest") doc.descendants((node, pos) => {
					if (node.isText) return;
					if (!(anchor >= pos && anchor <= pos + node.nodeSize - 1)) return false;
					maxLevels += 1;
				});
				let currentLevel = 0;
				doc.descendants((node, pos) => {
					if (node.isText) return false;
					if (!(anchor >= pos && anchor <= pos + node.nodeSize - 1)) return false;
					currentLevel += 1;
					if (this.options.mode === "deepest" && maxLevels - currentLevel > 0 || this.options.mode === "shallowest" && currentLevel > 1) return this.options.mode === "deepest";
					decorations.push(_tiptap_pm_view.Decoration.node(pos, pos + node.nodeSize, { class: this.options.className }));
				});
				return _tiptap_pm_view.DecorationSet.create(doc, decorations);
			} }
		})];
	}
});
//#endregion
exports.Focus = Focus;

//# sourceMappingURL=index.cjs.map