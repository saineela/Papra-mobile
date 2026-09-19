import { Mark, markInputRule, markPasteRule, mergeAttributes } from "@tiptap/core";
import { jsx } from "@tiptap/core/jsx-runtime";
//#region src/bold.tsx
/** @jsxImportSource @tiptap/core */
/**
* Matches bold text via `**` as input.
*/
const starInputRegex = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/;
/**
* Matches bold text via `**` while pasting.
*/
const starPasteRegex = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g;
/**
* Matches bold text via `__` as input.
*/
const underscoreInputRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
/**
* Matches bold text via `__` while pasting.
*/
const underscorePasteRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g;
/**
* This extension allows you to mark text as bold.
* @see https://tiptap.dev/api/marks/bold
*/
const Bold = Mark.create({
	name: "bold",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "strong" },
			{
				tag: "b",
				getAttrs: (node) => node.style.fontWeight !== "normal" && null
			},
			{
				style: "font-weight=400",
				clearMark: (mark) => mark.type.name === this.name
			},
			{
				style: "font-weight",
				getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null
			}
		];
	},
	renderHTML({ HTMLAttributes }) {
		return /* @__PURE__ */ jsx("strong", {
			...mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
			children: /* @__PURE__ */ jsx("slot", {})
		});
	},
	markdownTokenName: "strong",
	parseMarkdown: (token, helpers) => {
		return helpers.applyMark("bold", helpers.parseInline(token.tokens || []));
	},
	markdownOptions: { htmlReopen: {
		open: "<strong>",
		close: "</strong>"
	} },
	renderMarkdown: (node, h) => {
		return `**${h.renderChildren(node)}**`;
	},
	addCommands() {
		return {
			setBold: () => ({ commands }) => {
				return commands.setMark(this.name);
			},
			toggleBold: () => ({ commands }) => {
				return commands.toggleMark(this.name);
			},
			unsetBold: () => ({ commands }) => {
				return commands.unsetMark(this.name);
			}
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-b": () => this.editor.commands.toggleBold(),
			"Mod-B": () => this.editor.commands.toggleBold()
		};
	},
	addInputRules() {
		return [markInputRule({
			find: starInputRegex,
			type: this.type
		}), markInputRule({
			find: underscoreInputRegex,
			type: this.type
		})];
	},
	addPasteRules() {
		return [markPasteRule({
			find: starPasteRegex,
			type: this.type
		}), markPasteRule({
			find: underscorePasteRegex,
			type: this.type
		})];
	}
});
//#endregion
//#region src/index.ts
var src_default = Bold;
//#endregion
export { Bold, src_default as default, starInputRegex, starPasteRegex, underscoreInputRegex, underscorePasteRegex };

//# sourceMappingURL=index.js.map