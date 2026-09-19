import { Node, mergeAttributes } from "@tiptap/core";
//#region src/paragraph.ts
/**
* Markdown marker for empty paragraphs to preserve blank lines.
* Using &nbsp; (non-breaking space HTML entity) ensures the paragraph
* is not collapsed by markdown parsers while remaining human-readable.
*/
const EMPTY_PARAGRAPH_MARKDOWN = "&nbsp;";
/**
* Unicode character for non-breaking space (U+00A0).
* Some markdown parsers may convert &nbsp; entities to this literal character.
*/
const NBSP_CHAR = "\xA0";
/**
* This extension allows you to create paragraphs.
* @see https://www.tiptap.dev/api/nodes/paragraph
*/
const Paragraph = Node.create({
	name: "paragraph",
	priority: 1e3,
	addOptions() {
		return { HTMLAttributes: {} };
	},
	group: "block",
	content: "inline*",
	parseHTML() {
		return [{ tag: "p" }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"p",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
			0
		];
	},
	parseMarkdown: (token, helpers) => {
		const tokens = token.tokens || [];
		if (tokens.length === 1 && tokens[0].type === "image") return helpers.parseChildren([tokens[0]]);
		const content = helpers.parseInline(tokens);
		if (tokens.length === 1 && tokens[0].type === "text" && (tokens[0].raw === EMPTY_PARAGRAPH_MARKDOWN || tokens[0].text === EMPTY_PARAGRAPH_MARKDOWN || tokens[0].raw === NBSP_CHAR || tokens[0].text === NBSP_CHAR) && content.length === 1 && content[0].type === "text" && (content[0].text === EMPTY_PARAGRAPH_MARKDOWN || content[0].text === NBSP_CHAR)) return helpers.createNode("paragraph", void 0, []);
		return helpers.createNode("paragraph", void 0, content);
	},
	renderMarkdown: (node, h, ctx) => {
		if (!node) return "";
		const content = Array.isArray(node.content) ? node.content : [];
		if (content.length === 0) {
			var _ctx$previousNode, _ctx$previousNode2;
			const previousContent = Array.isArray(ctx === null || ctx === void 0 || (_ctx$previousNode = ctx.previousNode) === null || _ctx$previousNode === void 0 ? void 0 : _ctx$previousNode.content) ? ctx.previousNode.content : [];
			return (ctx === null || ctx === void 0 || (_ctx$previousNode2 = ctx.previousNode) === null || _ctx$previousNode2 === void 0 ? void 0 : _ctx$previousNode2.type) === "paragraph" && previousContent.length === 0 ? EMPTY_PARAGRAPH_MARKDOWN : "";
		}
		return h.renderChildren(content);
	},
	addCommands() {
		return { setParagraph: () => ({ commands }) => {
			return commands.setNode(this.name);
		} };
	},
	addKeyboardShortcuts() {
		return { "Mod-Alt-0": () => this.editor.commands.setParagraph() };
	}
});
//#endregion
//#region src/index.ts
var src_default = Paragraph;
//#endregion
export { Paragraph, src_default as default };

//# sourceMappingURL=index.js.map