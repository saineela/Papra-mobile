Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
let _tiptap_pm_model = require("@tiptap/pm/model");
let _tiptap_suggestion = require("@tiptap/suggestion");
let _tiptap_pm_state = require("@tiptap/pm/state");
//#region src/utils/get-default-suggestion-attributes.ts
/**
* Returns the suggestion options for a trigger of the Mention extension. These
* options are used to create a `Suggestion` ProseMirror plugin. Each plugin lets
* you define a different trigger that opens the Mention menu. For example,
* you can define a `@` trigger to mention users and a `#` trigger to mention
* tags.
*
* @param param0 The configured options for the suggestion
* @returns
*/
function getSuggestionOptions({ editor: tiptapEditor, overrideSuggestionOptions, extensionName, char = "@" }) {
	return {
		editor: tiptapEditor,
		char,
		pluginKey: new _tiptap_pm_state.PluginKey(),
		command: ({ editor, range, props }) => {
			var _nodeAfter$text, _editor$view$dom$owne;
			const nodeAfter = editor.view.state.selection.$to.nodeAfter;
			if (nodeAfter === null || nodeAfter === void 0 || (_nodeAfter$text = nodeAfter.text) === null || _nodeAfter$text === void 0 ? void 0 : _nodeAfter$text.startsWith(" ")) range.to += 1;
			editor.chain().focus().insertContentAt(range, [{
				type: extensionName,
				attrs: {
					...props,
					mentionSuggestionChar: char
				}
			}, {
				type: "text",
				text: " "
			}]).run();
			(_editor$view$dom$owne = editor.view.dom.ownerDocument.defaultView) === null || _editor$view$dom$owne === void 0 || (_editor$view$dom$owne = _editor$view$dom$owne.getSelection()) === null || _editor$view$dom$owne === void 0 || _editor$view$dom$owne.collapseToEnd();
		},
		allow: ({ state, range }) => {
			const $from = state.doc.resolve(range.from);
			const type = state.schema.nodes[extensionName];
			return !!$from.parent.type.contentMatch.matchType(type);
		},
		...overrideSuggestionOptions
	};
}
//#endregion
//#region src/mention.ts
/**
* Returns the suggestions for the mention extension.
*
* @param options The extension options
* @returns the suggestions
*/
function getSuggestions(options) {
	return (options.options.suggestions.length ? options.options.suggestions : [options.options.suggestion]).map((suggestion) => getSuggestionOptions({
		editor: options.editor,
		overrideSuggestionOptions: suggestion,
		extensionName: options.name,
		char: suggestion.char
	}));
}
/**
* Returns the suggestion options of the mention that has a given character trigger. If not
* found, it returns the first suggestion.
*
* @param options The extension options
* @param char The character that triggers the mention
* @returns The suggestion options
*/
function getSuggestionFromChar(options, char) {
	const suggestions = getSuggestions(options);
	const suggestion = suggestions.find((s) => s.char === char);
	if (suggestion) return suggestion;
	if (suggestions.length) return suggestions[0];
	return null;
}
/**
* This extension allows you to insert mentions into the editor.
* @see https://www.tiptap.dev/api/extensions/mention
*/
const Mention = _tiptap_core.Node.create({
	name: "mention",
	priority: 101,
	addOptions() {
		return {
			HTMLAttributes: {},
			renderText({ node, suggestion }) {
				var _suggestion$char, _node$attrs$label;
				return `${(_suggestion$char = suggestion === null || suggestion === void 0 ? void 0 : suggestion.char) !== null && _suggestion$char !== void 0 ? _suggestion$char : "@"}${(_node$attrs$label = node.attrs.label) !== null && _node$attrs$label !== void 0 ? _node$attrs$label : node.attrs.id}`;
			},
			deleteTriggerWithBackspace: false,
			renderHTML({ options, node, suggestion }) {
				var _suggestion$char2, _node$attrs$label2;
				return [
					"span",
					(0, _tiptap_core.mergeAttributes)(this.HTMLAttributes, options.HTMLAttributes),
					`${(_suggestion$char2 = suggestion === null || suggestion === void 0 ? void 0 : suggestion.char) !== null && _suggestion$char2 !== void 0 ? _suggestion$char2 : "@"}${(_node$attrs$label2 = node.attrs.label) !== null && _node$attrs$label2 !== void 0 ? _node$attrs$label2 : node.attrs.id}`
				];
			},
			suggestions: [],
			suggestion: {}
		};
	},
	group: "inline",
	inline: true,
	selectable: false,
	atom: true,
	addAttributes() {
		return {
			id: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-id"),
				renderHTML: (attributes) => {
					if (!attributes.id) return {};
					return { "data-id": attributes.id };
				}
			},
			label: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-label"),
				renderHTML: (attributes) => {
					if (!attributes.label) return {};
					return { "data-label": attributes.label };
				}
			},
			mentionSuggestionChar: {
				default: "@",
				parseHTML: (element) => element.getAttribute("data-mention-suggestion-char"),
				renderHTML: (attributes) => {
					return { "data-mention-suggestion-char": attributes.mentionSuggestionChar };
				}
			}
		};
	},
	parseHTML() {
		return [{ tag: `span[data-type="${this.name}"]` }];
	},
	renderHTML({ node, HTMLAttributes }) {
		const suggestion = getSuggestionFromChar(this, node.attrs.mentionSuggestionChar);
		if (this.options.renderLabel !== void 0) {
			console.warn("renderLabel is deprecated use renderText and renderHTML instead");
			return [
				"span",
				(0, _tiptap_core.mergeAttributes)({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes),
				this.options.renderLabel({
					options: this.options,
					node,
					suggestion
				})
			];
		}
		const mergedOptions = { ...this.options };
		mergedOptions.HTMLAttributes = (0, _tiptap_core.mergeAttributes)({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes);
		const html = this.options.renderHTML({
			options: mergedOptions,
			node,
			suggestion
		});
		if (typeof html === "string") return [
			"span",
			(0, _tiptap_core.mergeAttributes)({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes),
			html
		];
		return html;
	},
	...(0, _tiptap_core.createInlineMarkdownSpec)({
		nodeName: "mention",
		name: "@",
		selfClosing: true,
		allowedAttributes: [
			"id",
			"label",
			{
				name: "mentionSuggestionChar",
				skipIfDefault: "@"
			}
		],
		parseAttributes: (attrString) => {
			const attrs = {};
			const regex = /(?:^|\s)(\w+)=(?:"([^"]*)"|'([^']*)')/g;
			let match = regex.exec(attrString);
			while (match !== null) {
				const [, key, doubleQuoted, singleQuoted] = match;
				attrs[key === "char" ? "mentionSuggestionChar" : key] = doubleQuoted !== null && doubleQuoted !== void 0 ? doubleQuoted : singleQuoted;
				match = regex.exec(attrString);
			}
			return attrs;
		},
		serializeAttributes: (attrs) => {
			return Object.entries(attrs).filter(([, value]) => value !== void 0 && value !== null).map(([key, value]) => {
				return `${key === "mentionSuggestionChar" ? "char" : key}="${value}"`;
			}).join(" ");
		}
	}),
	renderText({ node }) {
		const args = {
			options: this.options,
			node,
			suggestion: getSuggestionFromChar(this, node.attrs.mentionSuggestionChar)
		};
		if (this.options.renderLabel !== void 0) {
			console.warn("renderLabel is deprecated use renderText and renderHTML instead");
			return this.options.renderLabel(args);
		}
		return this.options.renderText(args);
	},
	addKeyboardShortcuts() {
		return { Backspace: () => this.editor.commands.command(({ tr, state }) => {
			let isMention = false;
			const { selection } = state;
			const { empty, anchor } = selection;
			if (!empty) return false;
			let mentionNode = new _tiptap_pm_model.Node();
			let mentionPos = 0;
			state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
				if (node.type.name === this.name) {
					isMention = true;
					mentionNode = node;
					mentionPos = pos;
					return false;
				}
			});
			if (isMention) tr.insertText(this.options.deleteTriggerWithBackspace ? "" : mentionNode.attrs.mentionSuggestionChar, mentionPos, mentionPos + mentionNode.nodeSize);
			return isMention;
		}) };
	},
	addProseMirrorPlugins() {
		return getSuggestions(this).map(_tiptap_suggestion.Suggestion);
	}
});
//#endregion
//#region src/index.ts
var src_default = Mention;
//#endregion
exports.Mention = Mention;
exports.default = src_default;

//# sourceMappingURL=index.cjs.map