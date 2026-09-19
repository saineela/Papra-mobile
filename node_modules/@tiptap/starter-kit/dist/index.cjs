Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
let _tiptap_extension_blockquote = require("@tiptap/extension-blockquote");
let _tiptap_extension_bold = require("@tiptap/extension-bold");
let _tiptap_extension_code = require("@tiptap/extension-code");
let _tiptap_extension_code_block = require("@tiptap/extension-code-block");
let _tiptap_extension_document = require("@tiptap/extension-document");
let _tiptap_extension_hard_break = require("@tiptap/extension-hard-break");
let _tiptap_extension_heading = require("@tiptap/extension-heading");
let _tiptap_extension_horizontal_rule = require("@tiptap/extension-horizontal-rule");
let _tiptap_extension_italic = require("@tiptap/extension-italic");
let _tiptap_extension_link = require("@tiptap/extension-link");
let _tiptap_extension_list = require("@tiptap/extension-list");
let _tiptap_extension_paragraph = require("@tiptap/extension-paragraph");
let _tiptap_extension_strike = require("@tiptap/extension-strike");
let _tiptap_extension_text = require("@tiptap/extension-text");
let _tiptap_extension_underline = require("@tiptap/extension-underline");
let _tiptap_extensions = require("@tiptap/extensions");
//#region src/starter-kit.ts
/**
* The starter kit is a collection of essential editor extensions.
*
* It’s a good starting point for building your own editor.
*/
const StarterKit = _tiptap_core.Extension.create({
	name: "starterKit",
	addExtensions() {
		const extensions = [];
		if (this.options.bold !== false) extensions.push(_tiptap_extension_bold.Bold.configure(this.options.bold));
		if (this.options.blockquote !== false) extensions.push(_tiptap_extension_blockquote.Blockquote.configure(this.options.blockquote));
		if (this.options.bulletList !== false) extensions.push(_tiptap_extension_list.BulletList.configure(this.options.bulletList));
		if (this.options.code !== false) extensions.push(_tiptap_extension_code.Code.configure(this.options.code));
		if (this.options.codeBlock !== false) extensions.push(_tiptap_extension_code_block.CodeBlock.configure(this.options.codeBlock));
		if (this.options.document !== false) extensions.push(_tiptap_extension_document.Document.configure(this.options.document));
		if (this.options.dropcursor !== false) extensions.push(_tiptap_extensions.Dropcursor.configure(this.options.dropcursor));
		if (this.options.gapcursor !== false) extensions.push(_tiptap_extensions.Gapcursor.configure(this.options.gapcursor));
		if (this.options.hardBreak !== false) extensions.push(_tiptap_extension_hard_break.HardBreak.configure(this.options.hardBreak));
		if (this.options.heading !== false) extensions.push(_tiptap_extension_heading.Heading.configure(this.options.heading));
		if (this.options.undoRedo !== false) extensions.push(_tiptap_extensions.UndoRedo.configure(this.options.undoRedo));
		if (this.options.horizontalRule !== false) extensions.push(_tiptap_extension_horizontal_rule.HorizontalRule.configure(this.options.horizontalRule));
		if (this.options.italic !== false) extensions.push(_tiptap_extension_italic.Italic.configure(this.options.italic));
		if (this.options.listItem !== false) extensions.push(_tiptap_extension_list.ListItem.configure(this.options.listItem));
		if (this.options.listKeymap !== false) {
			var _this$options;
			extensions.push(_tiptap_extension_list.ListKeymap.configure((_this$options = this.options) === null || _this$options === void 0 ? void 0 : _this$options.listKeymap));
		}
		if (this.options.link !== false) {
			var _this$options2;
			extensions.push(_tiptap_extension_link.Link.configure((_this$options2 = this.options) === null || _this$options2 === void 0 ? void 0 : _this$options2.link));
		}
		if (this.options.orderedList !== false) extensions.push(_tiptap_extension_list.OrderedList.configure(this.options.orderedList));
		if (this.options.paragraph !== false) extensions.push(_tiptap_extension_paragraph.Paragraph.configure(this.options.paragraph));
		if (this.options.strike !== false) extensions.push(_tiptap_extension_strike.Strike.configure(this.options.strike));
		if (this.options.text !== false) extensions.push(_tiptap_extension_text.Text.configure(this.options.text));
		if (this.options.underline !== false) {
			var _this$options3;
			extensions.push(_tiptap_extension_underline.Underline.configure((_this$options3 = this.options) === null || _this$options3 === void 0 ? void 0 : _this$options3.underline));
		}
		if (this.options.trailingNode !== false) {
			var _this$options4;
			extensions.push(_tiptap_extensions.TrailingNode.configure((_this$options4 = this.options) === null || _this$options4 === void 0 ? void 0 : _this$options4.trailingNode));
		}
		return extensions;
	}
});
//#endregion
//#region src/index.ts
var src_default = StarterKit;
//#endregion
exports.StarterKit = StarterKit;
exports.default = src_default;

//# sourceMappingURL=index.cjs.map