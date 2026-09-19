import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
//#region src/focus/focus.ts
/**
* This extension allows you to add a class to the focused node.
* @see https://www.tiptap.dev/api/extensions/focus
*/
const Focus = Extension.create({
	name: "focus",
	addOptions() {
		return {
			className: "has-focus",
			mode: "all"
		};
	},
	addProseMirrorPlugins() {
		return [new Plugin({
			key: new PluginKey("focus"),
			props: { decorations: ({ doc, selection }) => {
				const { isEditable, isFocused } = this.editor;
				const { anchor } = selection;
				const decorations = [];
				if (!isEditable || !isFocused) return DecorationSet.create(doc, []);
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
					decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: this.options.className }));
				});
				return DecorationSet.create(doc, decorations);
			} }
		})];
	}
});
//#endregion
export { Focus };

//# sourceMappingURL=index.js.map