import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { jsx } from "@tiptap/core/jsx-runtime";
//#region src/handleBackspace.ts
/**
* Restructure the blockquote boundary at the caret.
*
* Two cases are handled in a single backspace:
*
* 1. Caret at the start of a non-first child of a blockquote — lift the
*    current child out, splitting the blockquote around it.
* 2. Caret at the start of a top-level textblock whose previous sibling is
*    a blockquote with a textblock last child — merge the current
*    textblock's inline content into the blockquote's last textblock
*    instead of letting joinBackward pull the paragraph back inside.
*
* Returns true when the backspace was consumed.
*/
const handleBackspace = (editor, type) => {
	var _previous$lastChild;
	const { state } = editor;
	const { selection } = state;
	if (!selection.empty) return false;
	const { $from } = selection;
	if ($from.parentOffset !== 0) return false;
	const parentDepth = $from.depth - 1;
	if (parentDepth < 0) return false;
	const parent = $from.node(parentDepth);
	const index = $from.index(parentDepth);
	if (index === 0) return false;
	if (parent.type === type) return editor.commands.lift(type.name);
	const previous = parent.child(index - 1);
	if (previous.type !== type || !((_previous$lastChild = previous.lastChild) === null || _previous$lastChild === void 0 ? void 0 : _previous$lastChild.isTextblock)) return false;
	const targetPos = $from.before() - 1 - 1;
	return editor.commands.command(({ tr, dispatch }) => {
		if (!dispatch) return true;
		const content = $from.parent.content;
		const slice = new Slice(content, 0, 0);
		tr.replace(targetPos, $from.after(), slice);
		tr.setSelection(TextSelection.create(tr.doc, targetPos + content.size));
		tr.scrollIntoView();
		dispatch(tr);
		return true;
	});
};
//#endregion
//#region src/blockquote.tsx
/** @jsxImportSource @tiptap/core */
/**
* Matches a blockquote to a `>` as input.
*/
const inputRegex = /^\s*>\s$/;
/**
* This extension allows you to create blockquotes.
* @see https://tiptap.dev/api/nodes/blockquote
*/
const Blockquote = Node.create({
	name: "blockquote",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	content: "block+",
	group: "block",
	defining: true,
	parseHTML() {
		return [{ tag: "blockquote" }];
	},
	renderHTML({ HTMLAttributes }) {
		return /* @__PURE__ */ jsx("blockquote", {
			...mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
			children: /* @__PURE__ */ jsx("slot", {})
		});
	},
	parseMarkdown: (token, helpers) => {
		var _helpers$parseBlockCh;
		const parseBlockChildren = (_helpers$parseBlockCh = helpers.parseBlockChildren) !== null && _helpers$parseBlockCh !== void 0 ? _helpers$parseBlockCh : helpers.parseChildren;
		return helpers.createNode("blockquote", void 0, parseBlockChildren(token.tokens || []));
	},
	renderMarkdown: (node, h) => {
		if (!node.content) return "";
		const prefix = ">";
		const result = [];
		node.content.forEach((child, index) => {
			var _h$renderChild, _h$renderChild2;
			const linesWithPrefix = ((_h$renderChild = (_h$renderChild2 = h.renderChild) === null || _h$renderChild2 === void 0 ? void 0 : _h$renderChild2.call(h, child, index)) !== null && _h$renderChild !== void 0 ? _h$renderChild : h.renderChildren([child])).split("\n").map((line) => {
				if (line.trim() === "") return prefix;
				return `${prefix} ${line}`;
			});
			result.push(linesWithPrefix.join("\n"));
		});
		return result.join(`\n${prefix}\n`);
	},
	addCommands() {
		return {
			setBlockquote: () => ({ commands }) => {
				return commands.wrapIn(this.name);
			},
			toggleBlockquote: () => ({ commands }) => {
				return commands.toggleWrap(this.name);
			},
			unsetBlockquote: () => ({ commands }) => {
				return commands.lift(this.name);
			}
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-Shift-b": () => this.editor.commands.toggleBlockquote(),
			Backspace: () => handleBackspace(this.editor, this.type)
		};
	},
	addInputRules() {
		return [wrappingInputRule({
			find: inputRegex,
			type: this.type
		})];
	}
});
//#endregion
//#region src/index.ts
var src_default = Blockquote;
//#endregion
export { Blockquote, src_default as default, inputRegex };

//# sourceMappingURL=index.js.map