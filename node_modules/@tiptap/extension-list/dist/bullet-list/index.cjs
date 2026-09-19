Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _tiptap_core = require("@tiptap/core");
//#region src/bullet-list/bullet-list.ts
const ListItemName = "listItem";
const TextStyleName = "textStyle";
/**
* Matches a bullet list to a dash or asterisk.
*/
const bulletListInputRegex = /^\s*([-+*])\s$/;
/**
* This extension allows you to create bullet lists.
* This requires the ListItem extension
* @see https://tiptap.dev/api/nodes/bullet-list
* @see https://tiptap.dev/api/nodes/list-item.
*/
const BulletList = _tiptap_core.Node.create({
	name: "bulletList",
	addOptions() {
		return {
			itemTypeName: "listItem",
			HTMLAttributes: {},
			keepMarks: false,
			keepAttributes: false
		};
	},
	group: "block list",
	content() {
		return `${this.options.itemTypeName}+`;
	},
	parseHTML() {
		return [{ tag: "ul" }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"ul",
			(0, _tiptap_core.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes),
			0
		];
	},
	markdownTokenName: "list",
	parseMarkdown: (token, helpers) => {
		if (token.type !== "list" || token.ordered) return [];
		return {
			type: "bulletList",
			content: token.items ? helpers.parseChildren(token.items) : []
		};
	},
	renderMarkdown: (node, h) => {
		if (!node.content) return "";
		return h.renderChildren(node.content, "\n");
	},
	markdownOptions: { indentsContent: true },
	addCommands() {
		return { toggleBulletList: () => ({ commands, chain }) => {
			if (this.options.keepAttributes) return chain().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(ListItemName, this.editor.getAttributes(TextStyleName)).run();
			return commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks);
		} };
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-8": () => this.editor.commands.toggleBulletList() };
	},
	addInputRules() {
		let inputRule = (0, _tiptap_core.wrappingInputRule)({
			find: bulletListInputRegex,
			type: this.type
		});
		if (this.options.keepMarks || this.options.keepAttributes) inputRule = (0, _tiptap_core.wrappingInputRule)({
			find: bulletListInputRegex,
			type: this.type,
			keepMarks: this.options.keepMarks,
			keepAttributes: this.options.keepAttributes,
			getAttributes: () => {
				return this.editor.getAttributes(TextStyleName);
			},
			editor: this.editor
		});
		return [inputRule];
	}
});
//#endregion
exports.BulletList = BulletList;
exports.bulletListInputRegex = bulletListInputRegex;

//# sourceMappingURL=index.cjs.map