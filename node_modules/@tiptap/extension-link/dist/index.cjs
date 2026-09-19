Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
let linkifyjs = require("linkifyjs");
let _tiptap_pm_state = require("@tiptap/pm/state");
//#region src/helpers/whitespace.ts
const UNICODE_WHITESPACE_PATTERN = "[\0- \xA0 ᠎ -\u2029 　]";
const UNICODE_WHITESPACE_REGEX = new RegExp(UNICODE_WHITESPACE_PATTERN);
const UNICODE_WHITESPACE_REGEX_END = new RegExp(`${UNICODE_WHITESPACE_PATTERN}$`);
const UNICODE_WHITESPACE_REGEX_GLOBAL = new RegExp(UNICODE_WHITESPACE_PATTERN, "g");
//#endregion
//#region src/helpers/autolink.ts
/**
* Check if the provided tokens form a valid link structure, which can either be a single link token
* or a link token surrounded by parentheses or square brackets.
*
* This ensures that only complete and valid text is hyperlinked, preventing cases where a valid
* top-level domain (TLD) is immediately followed by an invalid character, like a number. For
* example, with the `find` method from Linkify, entering `example.com1` would result in
* `example.com` being linked and the trailing `1` left as plain text. By using the `tokenize`
* method, we can perform more comprehensive validation on the input text.
*/
function isValidLinkStructure(tokens) {
	if (tokens.length === 1) return tokens[0].isLink;
	if (tokens.length === 3 && tokens[1].isLink) return ["()", "[]"].includes(tokens[0].value + tokens[2].value);
	return false;
}
/**
* This plugin allows you to automatically add links to your editor.
* @param options The plugin options
* @returns The plugin instance
*/
function autolink(options) {
	return new _tiptap_pm_state.Plugin({
		key: new _tiptap_pm_state.PluginKey("autolink"),
		appendTransaction: (transactions, oldState, newState) => {
			/**
			* Does the transaction change the document?
			*/
			const docChanges = transactions.some((transaction) => transaction.docChanged) && !oldState.doc.eq(newState.doc);
			/**
			* Prevent autolink if the transaction is not a document change or if the transaction has the meta `preventAutolink`.
			*/
			const preventAutolink = transactions.some((transaction) => transaction.getMeta("preventAutolink"));
			/**
			* Prevent autolink if the transaction is not a document change
			* or if the transaction has the meta `preventAutolink`.
			*/
			if (!docChanges || preventAutolink) return;
			const { tr } = newState;
			const transform = (0, _tiptap_core.combineTransactionSteps)(oldState.doc, [...transactions]);
			(0, _tiptap_core.getChangedRanges)(transform).forEach(({ newRange }) => {
				const nodesInChangedRanges = (0, _tiptap_core.findChildrenInRange)(newState.doc, newRange, (node) => node.isTextblock);
				let textBlock;
				let textBeforeWhitespace;
				if (nodesInChangedRanges.length > 1) {
					textBlock = nodesInChangedRanges[0];
					textBeforeWhitespace = newState.doc.textBetween(textBlock.pos, textBlock.pos + textBlock.node.nodeSize, void 0, " ");
				} else if (nodesInChangedRanges.length) {
					const endText = newState.doc.textBetween(newRange.from, newRange.to, " ", " ");
					if (!UNICODE_WHITESPACE_REGEX_END.test(endText)) return;
					textBlock = nodesInChangedRanges[0];
					textBeforeWhitespace = newState.doc.textBetween(textBlock.pos, newRange.to, void 0, " ");
				}
				if (textBlock && textBeforeWhitespace) {
					const wordsBeforeWhitespace = textBeforeWhitespace.split(UNICODE_WHITESPACE_REGEX).filter(Boolean);
					if (wordsBeforeWhitespace.length <= 0) return false;
					const lastWordBeforeSpace = wordsBeforeWhitespace[wordsBeforeWhitespace.length - 1];
					const lastWordAndBlockOffset = textBlock.pos + textBeforeWhitespace.lastIndexOf(lastWordBeforeSpace);
					if (!lastWordBeforeSpace) return false;
					const linksBeforeSpace = (0, linkifyjs.tokenize)(lastWordBeforeSpace).map((t) => t.toObject(options.defaultProtocol));
					if (!isValidLinkStructure(linksBeforeSpace)) return false;
					linksBeforeSpace.filter((link) => link.isLink).map((link) => ({
						...link,
						from: lastWordAndBlockOffset + link.start + 1,
						to: lastWordAndBlockOffset + link.end + 1
					})).filter((link) => {
						if (!newState.schema.marks.code) return true;
						return !newState.doc.rangeHasMark(link.from, link.to, newState.schema.marks.code);
					}).filter((link) => options.validate(link.value)).filter((link) => options.shouldAutoLink(link.value)).forEach((link) => {
						if ((0, _tiptap_core.getMarksBetween)(link.from, link.to, newState.doc).some((item) => item.mark.type === options.type)) return;
						tr.addMark(link.from, link.to, options.type.create({ href: link.href }));
					});
				}
			});
			if (!tr.steps.length) return;
			return tr;
		}
	});
}
//#endregion
//#region src/helpers/clickHandler.ts
function clickHandler(options) {
	return new _tiptap_pm_state.Plugin({
		key: new _tiptap_pm_state.PluginKey("handleClickLink"),
		props: { handleClick: (view, pos, event) => {
			if (event.button !== 0) return false;
			if (!view.editable) return false;
			let link = null;
			if (event.target instanceof HTMLAnchorElement) link = event.target;
			else {
				const target = event.target;
				if (!target) return false;
				const root = options.editor.view.dom;
				link = target.closest("a");
				if (link && !root.contains(link)) link = null;
			}
			if (!link) return false;
			let handled = false;
			if (options.enableClickSelection) handled = options.editor.commands.extendMarkRange(options.type.name);
			if (options.openOnClick) {
				var _link$href, _link$target;
				const attrs = (0, _tiptap_core.getAttributes)(view.state, options.type.name);
				const href = (_link$href = link.href) !== null && _link$href !== void 0 ? _link$href : attrs.href;
				const target = (_link$target = link.target) !== null && _link$target !== void 0 ? _link$target : attrs.target;
				if (href) {
					window.open(href, target);
					handled = true;
				}
			}
			return handled;
		} }
	});
}
//#endregion
//#region src/helpers/markdownLink.ts
/**
* Matches a Markdown link with an optional quoted title.
* for ex: [Tiptap](https://tiptap.dev) or [Tiptap](https://tiptap.dev "some title")
* the URL may also contain one level of balanced parentheses, as in CommonMark
* (titles accept curly quotes too, the Typography extension swaps them in while typing)
* the title delimiters must come in matching pairs
*/
const MARKDOWN_LINK_INPUT_REGEX = /\[([^[\]]+)\]\(((?:[^\s()]|\([^\s()]*\))+)(?:\s+(?:(["'])(.*?)\3|“(.*?)”|‘(.*?)’))?\)$/;
/**
* Same as the input regex but global, to find every Markdown link in pasted text.
*/
const MARKDOWN_LINK_PASTE_REGEX = /\[([^[\]]+)\]\(((?:[^\s()]|\([^\s()]*\))+)(?:\s+(?:(["'])(.*?)\3|“(.*?)”|‘(.*?)’))?\)/g;
function isEscaped(text, index) {
	let backslashes = 0;
	for (let position = index - 1; position >= 0 && text[position] === "\\"; position -= 1) backslashes += 1;
	return backslashes % 2 === 1;
}
/**
* Pairs the backtick runs before the match by length, as CommonMark does.
* A run left open means the match sits in an unfinished code span.
*/
function isInsideCodeSpan(text, matchIndex) {
	let openRunLength = 0;
	let index = 0;
	while (index < matchIndex) {
		if (text[index] !== "`") {
			index += 1;
			continue;
		}
		if (openRunLength === 0 && isEscaped(text, index)) {
			index += 1;
			continue;
		}
		let runLength = 0;
		while (index < matchIndex && text[index] === "`") {
			runLength += 1;
			index += 1;
		}
		if (openRunLength === 0) openRunLength = runLength;
		else if (runLength === openRunLength) openRunLength = 0;
	}
	return openRunLength > 0;
}
function isConvertibleLink(text, match, isAllowedHref) {
	var _match$index, _match$index2;
	const [, linkText, href] = match;
	if ((match.index ? text[match.index - 1] : void 0) === "!" || isEscaped(text, (_match$index = match.index) !== null && _match$index !== void 0 ? _match$index : 0)) return false;
	if (isInsideCodeSpan(text, (_match$index2 = match.index) !== null && _match$index2 !== void 0 ? _match$index2 : 0)) return false;
	return !!linkText.trim() && isAllowedHref(href);
}
function toRuleMatch(match) {
	var _ref, _match$index3;
	const [linkSyntax, linkText, href, , straightQuotedTitle, curlyDoubleTitle, curlySingleTitle] = match;
	const title = (_ref = straightQuotedTitle !== null && straightQuotedTitle !== void 0 ? straightQuotedTitle : curlyDoubleTitle) !== null && _ref !== void 0 ? _ref : curlySingleTitle;
	return {
		index: (_match$index3 = match.index) !== null && _match$index3 !== void 0 ? _match$index3 : 0,
		text: linkSyntax,
		replaceWith: linkText,
		data: {
			href,
			title: title || null,
			markdown: true
		}
	};
}
function matchesOverlap(a, b) {
	return a.index < b.index + b.text.length && b.index < a.index + a.text.length;
}
function getMarkdownLinkAttributes(match) {
	var _match$data, _match$data$title, _match$data2;
	return {
		href: (_match$data = match.data) === null || _match$data === void 0 ? void 0 : _match$data.href,
		title: (_match$data$title = (_match$data2 = match.data) === null || _match$data2 === void 0 ? void 0 : _match$data2.title) !== null && _match$data$title !== void 0 ? _match$data$title : null
	};
}
/**
* Turns typed Markdown link syntax into a link mark as soon as the closing `)` comes in.
* The transaction gets flagged so autolink doesn't touch the converted text again.
*/
function markdownLinkInputRule(config) {
	const rule = (0, _tiptap_core.markInputRule)({
		find: (text) => {
			const match = MARKDOWN_LINK_INPUT_REGEX.exec(text);
			if (!match || !isConvertibleLink(text, match, config.isAllowedHref)) return null;
			return toRuleMatch(match);
		},
		type: config.type,
		getAttributes: getMarkdownLinkAttributes
	});
	return new _tiptap_core.InputRule({
		find: rule.find,
		handler: (props) => {
			const result = rule.handler(props);
			if (result !== null && props.state.tr.steps.length) props.state.tr.setMeta("preventAutolink", true);
			return result;
		}
	});
}
/**
* Same for pasting, converts every Markdown link found in the pasted text
* and links the plain URLs from `findPlainUrls`.
*/
function markdownLinkPasteRule(config) {
	const rule = (0, _tiptap_core.markPasteRule)({
		find: (text) => {
			var _config$findPlainUrls, _config$findPlainUrls2;
			const markdownMatches = [];
			for (const match of text.matchAll(MARKDOWN_LINK_PASTE_REGEX)) if (isConvertibleLink(text, match, config.isAllowedHref)) markdownMatches.push(toRuleMatch(match));
			const plainUrlMatches = ((_config$findPlainUrls = (_config$findPlainUrls2 = config.findPlainUrls) === null || _config$findPlainUrls2 === void 0 ? void 0 : _config$findPlainUrls2.call(config, text)) !== null && _config$findPlainUrls !== void 0 ? _config$findPlainUrls : []).filter((urlMatch) => !markdownMatches.some((markdownMatch) => matchesOverlap(markdownMatch, urlMatch)));
			return [...markdownMatches, ...plainUrlMatches];
		},
		type: config.type,
		getAttributes: getMarkdownLinkAttributes
	});
	return new _tiptap_core.PasteRule({
		find: rule.find,
		handler: (props) => {
			var _props$match$data;
			const result = rule.handler(props);
			if (result !== null && props.state.tr.steps.length && ((_props$match$data = props.match.data) === null || _props$match$data === void 0 ? void 0 : _props$match$data.markdown)) props.state.tr.setMeta("preventAutolink", true);
			return result;
		}
	});
}
//#endregion
//#region src/helpers/pasteHandler.ts
function pasteHandler(options) {
	return new _tiptap_pm_state.Plugin({
		key: new _tiptap_pm_state.PluginKey("handlePasteLink"),
		props: { handlePaste: (view, _event, slice) => {
			const { shouldAutoLink } = options;
			const { state } = view;
			const { selection } = state;
			const { empty } = selection;
			if (empty) return false;
			let textContent = "";
			slice.content.forEach((node) => {
				textContent += node.textContent;
			});
			const link = (0, linkifyjs.find)(textContent, { defaultProtocol: options.defaultProtocol }).find((item) => item.isLink && item.value === textContent);
			if (!textContent || !link || shouldAutoLink !== void 0 && !shouldAutoLink(link.value)) return false;
			return options.editor.commands.setMark(options.type, { href: link.href });
		} }
	});
}
//#endregion
//#region src/link.ts
const pasteRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b(?:[-a-zA-Z0-9@:%._+~#=?!&/]*)(?:[-a-zA-Z0-9@:%._+~#=?!&/]*)/gi;
function isAllowedUri(uri, protocols) {
	const allowedProtocols = [
		"http",
		"https",
		"ftp",
		"ftps",
		"mailto",
		"tel",
		"callto",
		"sms",
		"cid",
		"xmpp"
	];
	if (protocols) protocols.forEach((protocol) => {
		const nextProtocol = typeof protocol === "string" ? protocol : protocol.scheme;
		if (nextProtocol) allowedProtocols.push(nextProtocol);
	});
	return !uri || uri.replace(UNICODE_WHITESPACE_REGEX_GLOBAL, "").match(new RegExp(`^(?:(?:${allowedProtocols.map((protocol) => protocol.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|")}):|[^a-z]|[a-z0-9+.\\-]+(?:[^a-z+.\\-:]|$))`, "i"));
}
/**
* This extension allows you to create links.
* @see https://www.tiptap.dev/api/marks/link
*/
const Link = _tiptap_core.Mark.create({
	name: "link",
	priority: 1e3,
	keepOnSplit: false,
	exitable: true,
	onCreate() {
		if (this.options.validate && !this.options.shouldAutoLink) {
			this.options.shouldAutoLink = this.options.validate;
			console.warn("The `validate` option is deprecated. Rename to the `shouldAutoLink` option instead.");
		}
		this.options.protocols.forEach((protocol) => {
			if (typeof protocol === "string") {
				(0, linkifyjs.registerCustomProtocol)(protocol);
				return;
			}
			(0, linkifyjs.registerCustomProtocol)(protocol.scheme, protocol.optionalSlashes);
		});
	},
	onDestroy() {
		(0, linkifyjs.reset)();
	},
	inclusive() {
		return this.options.autolink;
	},
	addOptions() {
		return {
			openOnClick: true,
			enableClickSelection: false,
			linkOnPaste: true,
			markdownLinks: false,
			autolink: true,
			protocols: [],
			defaultProtocol: "http",
			HTMLAttributes: {
				target: "_blank",
				rel: "noopener noreferrer nofollow",
				class: null
			},
			isAllowedUri: (url, ctx) => !!isAllowedUri(url, ctx.protocols),
			validate: (url) => !!url,
			shouldAutoLink: (url) => {
				const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
				const hasMaybeProtocol = /^[a-z][a-z0-9+.-]*:/i.test(url);
				if (hasProtocol || hasMaybeProtocol && !url.includes("@")) return true;
				const hostname = (url.includes("@") ? url.split("@").pop() : url).split(/[/?#:]/)[0];
				if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
				if (!/\./.test(hostname)) return false;
				return true;
			}
		};
	},
	addAttributes() {
		var _this$options$HTMLAtt, _this$options$HTMLAtt2, _this$options$HTMLAtt3;
		return {
			href: {
				default: null,
				parseHTML(element) {
					return element.getAttribute("href");
				}
			},
			target: { default: (_this$options$HTMLAtt = this.options.HTMLAttributes.target) !== null && _this$options$HTMLAtt !== void 0 ? _this$options$HTMLAtt : null },
			rel: { default: (_this$options$HTMLAtt2 = this.options.HTMLAttributes.rel) !== null && _this$options$HTMLAtt2 !== void 0 ? _this$options$HTMLAtt2 : null },
			class: { default: (_this$options$HTMLAtt3 = this.options.HTMLAttributes.class) !== null && _this$options$HTMLAtt3 !== void 0 ? _this$options$HTMLAtt3 : null },
			title: { default: null }
		};
	},
	parseHTML() {
		return [{
			tag: "a[href]",
			getAttrs: (dom) => {
				const href = dom.getAttribute("href");
				if (!href || !this.options.isAllowedUri(href, {
					defaultValidate: (url) => !!isAllowedUri(url, this.options.protocols),
					protocols: this.options.protocols,
					defaultProtocol: this.options.defaultProtocol
				})) return false;
				return null;
			}
		}];
	},
	renderHTML({ HTMLAttributes }) {
		if (!this.options.isAllowedUri(HTMLAttributes.href, {
			defaultValidate: (href) => !!isAllowedUri(href, this.options.protocols),
			protocols: this.options.protocols,
			defaultProtocol: this.options.defaultProtocol
		})) return [
			"a",
			(0, _tiptap_core.mergeAttributes)(this.options.HTMLAttributes, {
				...HTMLAttributes,
				href: ""
			}),
			0
		];
		return [
			"a",
			(0, _tiptap_core.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes),
			0
		];
	},
	markdownTokenName: "link",
	parseMarkdown: (token, helpers) => {
		return helpers.applyMark("link", helpers.parseInline(token.tokens || []), {
			href: token.href,
			title: token.title || null
		});
	},
	renderMarkdown: (node, h) => {
		var _node$attrs$href, _node$attrs, _node$attrs$title, _node$attrs2;
		const href = (_node$attrs$href = (_node$attrs = node.attrs) === null || _node$attrs === void 0 ? void 0 : _node$attrs.href) !== null && _node$attrs$href !== void 0 ? _node$attrs$href : "";
		const title = (_node$attrs$title = (_node$attrs2 = node.attrs) === null || _node$attrs2 === void 0 ? void 0 : _node$attrs2.title) !== null && _node$attrs$title !== void 0 ? _node$attrs$title : "";
		const text = h.renderChildren(node);
		return title ? `[${text}](${href} "${title}")` : `[${text}](${href})`;
	},
	addCommands() {
		return {
			setLink: (attributes) => ({ chain }) => {
				const { href } = attributes;
				if (!this.options.isAllowedUri(href, {
					defaultValidate: (url) => !!isAllowedUri(url, this.options.protocols),
					protocols: this.options.protocols,
					defaultProtocol: this.options.defaultProtocol
				})) return false;
				return chain().setMark(this.name, attributes).setMeta("preventAutolink", true).run();
			},
			toggleLink: (attributes) => ({ chain }) => {
				const { href } = attributes || {};
				if (href && !this.options.isAllowedUri(href, {
					defaultValidate: (url) => !!isAllowedUri(url, this.options.protocols),
					protocols: this.options.protocols,
					defaultProtocol: this.options.defaultProtocol
				})) return false;
				return chain().toggleMark(this.name, attributes, { extendEmptyMarkRange: true }).setMeta("preventAutolink", true).run();
			},
			unsetLink: () => ({ chain }) => {
				return chain().unsetMark(this.name, { extendEmptyMarkRange: true }).setMeta("preventAutolink", true).run();
			}
		};
	},
	addInputRules() {
		if (!this.options.markdownLinks) return [];
		return [markdownLinkInputRule({
			type: this.type,
			isAllowedHref: (href) => this.options.isAllowedUri(href, {
				defaultValidate: (url) => !!isAllowedUri(url, this.options.protocols),
				protocols: this.options.protocols,
				defaultProtocol: this.options.defaultProtocol
			})
		})];
	},
	addPasteRules() {
		const findPlainUrls = (text) => {
			const foundLinks = [];
			if (text) {
				const { protocols, defaultProtocol } = this.options;
				(0, linkifyjs.find)(text).filter((item) => item.isLink && this.options.isAllowedUri(item.value, {
					defaultValidate: (href) => !!isAllowedUri(href, protocols),
					protocols,
					defaultProtocol
				})).forEach((link) => {
					if (!this.options.shouldAutoLink(link.value)) return;
					foundLinks.push({
						text: link.value,
						data: { href: link.href },
						index: link.start
					});
				});
			}
			return foundLinks;
		};
		if (this.options.markdownLinks) return [markdownLinkPasteRule({
			type: this.type,
			isAllowedHref: (href) => this.options.isAllowedUri(href, {
				defaultValidate: (url) => !!isAllowedUri(url, this.options.protocols),
				protocols: this.options.protocols,
				defaultProtocol: this.options.defaultProtocol
			}),
			findPlainUrls
		})];
		return [(0, _tiptap_core.markPasteRule)({
			find: findPlainUrls,
			type: this.type,
			getAttributes: (match) => {
				var _match$data;
				return { href: (_match$data = match.data) === null || _match$data === void 0 ? void 0 : _match$data.href };
			}
		})];
	},
	addProseMirrorPlugins() {
		const plugins = [];
		const { protocols, defaultProtocol } = this.options;
		if (this.options.autolink) plugins.push(autolink({
			type: this.type,
			defaultProtocol: this.options.defaultProtocol,
			validate: (url) => this.options.isAllowedUri(url, {
				defaultValidate: (href) => !!isAllowedUri(href, protocols),
				protocols,
				defaultProtocol
			}),
			shouldAutoLink: this.options.shouldAutoLink
		}));
		plugins.push(clickHandler({
			type: this.type,
			editor: this.editor,
			openOnClick: this.options.openOnClick === "whenNotEditable" ? true : this.options.openOnClick,
			enableClickSelection: this.options.enableClickSelection
		}));
		if (this.options.linkOnPaste) plugins.push(pasteHandler({
			editor: this.editor,
			defaultProtocol: this.options.defaultProtocol,
			type: this.type,
			shouldAutoLink: this.options.shouldAutoLink
		}));
		return plugins;
	}
});
//#endregion
//#region src/index.ts
var src_default = Link;
//#endregion
exports.Link = Link;
exports.default = src_default;
exports.isAllowedUri = isAllowedUri;
exports.pasteRegex = pasteRegex;

//# sourceMappingURL=index.cjs.map