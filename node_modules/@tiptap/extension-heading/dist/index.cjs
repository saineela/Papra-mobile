Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
//#region src/heading.ts
/**
* This extension allows you to create headings.
* @see https://www.tiptap.dev/api/nodes/heading
*/
const Heading = _tiptap_core.Node.create({
	name: "heading",
	addOptions() {
		return {
			levels: [
				1,
				2,
				3,
				4,
				5,
				6
			],
			HTMLAttributes: {}
		};
	},
	content: "inline*",
	group: "block",
	defining: true,
	addAttributes() {
		return { level: {
			default: 1,
			rendered: false
		} };
	},
	parseHTML() {
		return this.options.levels.map((level) => ({
			tag: `h${level}`,
			attrs: { level }
		}));
	},
	renderHTML({ node, HTMLAttributes }) {
		return [
			`h${this.options.levels.includes(node.attrs.level) ? node.attrs.level : this.options.levels[0]}`,
			(0, _tiptap_core.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes),
			0
		];
	},
	parseMarkdown: (token, helpers) => {
		return helpers.createNode("heading", { level: token.depth || 1 }, helpers.parseInline(token.tokens || []));
	},
	renderMarkdown: (node, h) => {
		var _node$attrs;
		const level = ((_node$attrs = node.attrs) === null || _node$attrs === void 0 ? void 0 : _node$attrs.level) ? parseInt(node.attrs.level, 10) : 1;
		const headingChars = "#".repeat(level);
		if (!node.content) return "";
		return `${headingChars} ${h.renderChildren(node.content)}`;
	},
	addCommands() {
		return {
			setHeading: (attributes) => ({ commands }) => {
				if (!this.options.levels.includes(attributes.level)) return false;
				return commands.setNode(this.name, attributes);
			},
			toggleHeading: (attributes) => ({ commands }) => {
				if (!this.options.levels.includes(attributes.level)) return false;
				return commands.toggleNode(this.name, "paragraph", attributes);
			}
		};
	},
	addKeyboardShortcuts() {
		return this.options.levels.reduce((items, level) => ({
			...items,
			[`Mod-Alt-${level}`]: () => this.editor.commands.toggleHeading({ level })
		}), {});
	},
	addInputRules() {
		return this.options.levels.map((level) => {
			return (0, _tiptap_core.textblockTypeInputRule)({
				find: new RegExp(`^(#{${Math.min(...this.options.levels)},${level}})\\s$`),
				type: this.type,
				getAttributes: { level }
			});
		});
	}
});
//#endregion
//#region src/index.ts
var src_default = Heading;
//#endregion
exports.Heading = Heading;
exports.default = src_default;

//# sourceMappingURL=index.cjs.map