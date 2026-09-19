import { Plugin } from "@tiptap/pm/state";
import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";
//#region src/ordered-list/roman.ts
const ROMAN_NUMERALS = [
	[1e3, "m"],
	[900, "cm"],
	[500, "d"],
	[400, "cd"],
	[100, "c"],
	[90, "xc"],
	[50, "l"],
	[40, "xl"],
	[10, "x"],
	[9, "ix"],
	[5, "v"],
	[4, "iv"],
	[1, "i"]
];
const ALPHA_NUMERALS = "abcdefghijklmnopqrstuvwxyz";
/**
* Marker segment for ordered list lines: numeric, roman, or 1–2 letter alpha.
* Roman is matched before alpha so "iii" is roman; invalid romans like "aa" fall through to alpha.
*/
const ORDERED_LIST_MARKER_PATTERN = String.raw`\d+|[ivxlcdmIVXLCDM]+|${"[a-zA-Z]{1,2}"}`;
/**
* Convert a number to lowercase roman numerals.
* @example toRoman(1) // 'i'
* @example toRoman(4) // 'iv'
*/
function toRoman(num) {
	let remaining = num;
	let result = "";
	for (const [value, numeral] of ROMAN_NUMERALS) while (remaining >= value) {
		result += numeral;
		remaining -= value;
	}
	return result;
}
/**
* Convert a number to uppercase roman numerals.
* @example toRomanUpper(1) // 'I'
* @example toRomanUpper(4) // 'IV'
*/
function toRomanUpper(num) {
	return toRoman(num).toUpperCase();
}
function fromRoman(roman) {
	const lower = roman.toLowerCase();
	let index = 0;
	let result = 0;
	while (index < lower.length) {
		let matched = false;
		for (const [value, numeral] of ROMAN_NUMERALS) if (lower.startsWith(numeral, index)) {
			result += value;
			index += numeral.length;
			matched = true;
			break;
		}
		if (!matched) return 0;
	}
	return result;
}
function isValidRoman(marker) {
	if (!/^[ivxlcdmIVXLCDM]+$/.test(marker)) return false;
	const value = fromRoman(marker);
	if (value <= 0) return false;
	return (marker === marker.toLowerCase() ? toRoman(value) : toRomanUpper(value)) === marker;
}
function fromAlpha(marker) {
	const lower = marker.toLowerCase();
	if (lower.length === 1) return lower.charCodeAt(0) - "a".charCodeAt(0) + 1;
	if (lower.length === 2) {
		const first = lower.charCodeAt(0) - "a".charCodeAt(0);
		const second = lower.charCodeAt(1) - "a".charCodeAt(0);
		return (first + 1) * 26 + second + 1;
	}
	return 0;
}
function toRomanAlpha(num) {
	if (num <= 26) return ALPHA_NUMERALS[num - 1];
	const first = Math.floor((num - 1) / 26) - 1;
	const second = (num - 1) % 26;
	if (first < 0) return ALPHA_NUMERALS[second];
	return ALPHA_NUMERALS[first] + ALPHA_NUMERALS[second];
}
/**
* Extract the list marker type from a marker string.
* Supports "1", "a", "A", "i", "I" marker styles.
*
* @param marker The text content of the list marker (e.g. "a", "1", "iii", "b")
* @returns The normalized type string, or undefined for default numeric type
*/
function detectMarkerType(marker) {
	if (!marker || /^\d+$/.test(marker)) return;
	if (isValidRoman(marker)) return marker === marker.toLowerCase() ? "i" : "I";
	if (/^[a-z]{1,2}$/.test(marker)) return "a";
	if (/^[A-Z]{1,2}$/.test(marker)) return "A";
}
/**
* Convert a list marker string to its numeric start position.
*
* @param marker The text content of the list marker (e.g. "3", "b", "II")
* @returns The 1-based start value for the ordered list
*/
function markerToStart(marker) {
	if (/^\d+$/.test(marker)) return parseInt(marker, 10);
	const type = detectMarkerType(marker);
	if (type === "i" || type === "I") return fromRoman(marker);
	if (type === "a" || type === "A") {
		const start = fromAlpha(marker);
		return start > 0 ? start : 1;
	}
	const parsed = parseInt(marker, 10);
	return Number.isNaN(parsed) ? 1 : parsed;
}
function startToMarker(type, start) {
	if (type === "numeric") return String(start);
	switch (type) {
		case "a": return toRomanAlpha(start);
		case "A": return toRomanAlpha(start).toUpperCase();
		case "i": return toRoman(start);
		case "I": return toRomanUpper(start);
		default: return String(start);
	}
}
/**
* Returns true when all markers share the same style and increment by 1.
* Style is inferred from the first marker so ambiguous letters (e.g. "c", "i")
* are not re-classified differently on later lines.
*/
function areOrderedListMarkersSequential(markers) {
	var _detectMarkerType;
	if (markers.length === 0) return false;
	const firstType = (_detectMarkerType = detectMarkerType(markers[0])) !== null && _detectMarkerType !== void 0 ? _detectMarkerType : "numeric";
	const firstStart = markerToStart(markers[0]);
	if (firstStart < 1) return false;
	for (let i = 0; i < markers.length; i++) {
		const expected = startToMarker(firstType, firstStart + i);
		if (markers[i] !== expected) return false;
	}
	return true;
}
/**
* Parse a list marker into HTML ordered-list attrs (type + start).
*/
function parseListMarker(marker) {
	return {
		type: detectMarkerType(marker),
		start: markerToStart(marker)
	};
}
/**
* Build orderedList node attrs from the first list item marker.
*/
function buildOrderedListAttrsFromMarker(marker) {
	const { type, start } = parseListMarker(marker);
	const attrs = {};
	if (type) attrs.type = type;
	if (start !== 1) attrs.start = start;
	return attrs;
}
/**
* Returns the list marker prefix for a given item at a given index.
*
* @param type The list type attribute (e.g. "a", "A", "i", "I", null/undefined for default)
* @param index The zero-based index of the list item
* @param separator The separator to use (default: ". ")
* @returns The marker string (e.g. "a. ", "I. ", "1. ")
*/
function getListMarker(type, index, separator = ". ") {
	const position = index + 1;
	if (!type || type === "1") return `${position}${separator}`;
	switch (type) {
		case "a": return `${toRomanAlpha(position)}${separator}`;
		case "A": return `${toRomanAlpha(position).toUpperCase()}${separator}`;
		case "i": return `${toRoman(position)}${separator}`;
		case "I": return `${toRomanUpper(position)}${separator}`;
		default: return `${position}${separator}`;
	}
}
//#endregion
//#region src/ordered-list/utils.ts
/**
* Matches an ordered list item line with optional leading whitespace.
* Captures: (1) indentation spaces, (2) item marker (number, letter, or roman numeral),
* (3) separator (. or )), (4) content after marker
*
* Examples: "1. Item", "  a) Nested item", "    I. Roman item", "iii. Another", "aa. Item 27"
*/
const ORDERED_LIST_ITEM_REGEX = new RegExp(`^(\\s*)(${ORDERED_LIST_MARKER_PATTERN})([.)])\\s+(.*)$`);
/**
* Matches any line that starts with whitespace (indented content).
* Used to identify continuation content that belongs to a list item.
*/
const INDENTED_LINE_REGEX = /^\s/;
/**
* This are blocks that can interrupt a paragraph, so a line starting with one of
* them can never be lazy continuation text of a list item
*/
const PARAGRAPH_INTERRUPTERS = {
	heading: /^#{1,6}(?:\s|$)/,
	bulletItem: /^[-+*]\s+/,
	codeFence: /^(?:```|~~~)/,
	blockMath: /^\$\$/,
	thematicBreak: /^(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/
};
function isOrderedListMarkerLine(line) {
	return ORDERED_LIST_ITEM_REGEX.test(line.trimStart());
}
function isBlockContentLine(line) {
	const trimmedLine = line.trimStart();
	return PARAGRAPH_INTERRUPTERS.bulletItem.test(trimmedLine) || isOrderedListMarkerLine(trimmedLine) || PARAGRAPH_INTERRUPTERS.heading.test(trimmedLine) || PARAGRAPH_INTERRUPTERS.thematicBreak.test(trimmedLine) && !trimmedLine.startsWith("-") || /^>\s?/.test(trimmedLine) || PARAGRAPH_INTERRUPTERS.codeFence.test(trimmedLine) || PARAGRAPH_INTERRUPTERS.blockMath.test(trimmedLine);
}
function interruptsLazyContinuation(line) {
	return Object.values(PARAGRAPH_INTERRUPTERS).some((pattern) => pattern.test(line));
}
function splitItemContent(contentLines) {
	const paragraphLines = [];
	const blockLines = [];
	let reachedBlockBoundary = false;
	contentLines.forEach((line) => {
		if (reachedBlockBoundary) {
			blockLines.push(line);
			return;
		}
		if (line.trim() === "") {
			reachedBlockBoundary = true;
			blockLines.push(line);
			return;
		}
		if (paragraphLines.length > 0 && isBlockContentLine(line)) {
			reachedBlockBoundary = true;
			blockLines.push(line);
			return;
		}
		paragraphLines.push(line);
	});
	return {
		paragraphLines,
		blockLines
	};
}
/**
* Collects all ordered list items from lines, parsing them into a flat array
* with indentation information. Stops collecting continuation content when
* encountering nested list items, allowing them to be processed separately.
*
* @param lines - Array of source lines to parse
* @returns Tuple of [listItems array, number of lines consumed]
*/
function collectOrderedListItems(lines) {
	const listItems = [];
	let currentLineIndex = 0;
	let consumed = 0;
	while (currentLineIndex < lines.length) {
		const line = lines[currentLineIndex];
		const match = line.match(ORDERED_LIST_ITEM_REGEX);
		if (!match) break;
		const [, indent, marker, _separator, content] = match;
		const indentLevel = indent.length;
		const number = parseInt(marker, 10);
		const markerType = isNaN(number) ? detectMarkerType(marker) : void 0;
		const itemNumber = isNaN(number) ? markerToStart(marker) : number;
		const itemContentLines = [content];
		let nextLineIndex = currentLineIndex + 1;
		const itemLines = [line];
		let sawBlankLine = false;
		while (nextLineIndex < lines.length) {
			const nextLine = lines[nextLineIndex];
			if (nextLine.match(ORDERED_LIST_ITEM_REGEX)) break;
			if (nextLine.trim() === "") {
				itemLines.push(nextLine);
				itemContentLines.push("");
				sawBlankLine = true;
				nextLineIndex += 1;
			} else if (nextLine.match(INDENTED_LINE_REGEX)) {
				const leadingWhitespace = nextLine.length - nextLine.trimStart().length;
				const contentIndent = indentLevel + marker.length + 1;
				itemLines.push(nextLine);
				itemContentLines.push(nextLine.slice(Math.min(leadingWhitespace, contentIndent)));
				nextLineIndex += 1;
			} else {
				if (sawBlankLine || interruptsLazyContinuation(nextLine)) break;
				itemLines.push(nextLine);
				itemContentLines.push(nextLine);
				nextLineIndex += 1;
			}
		}
		listItems.push({
			indent: indentLevel,
			number: itemNumber,
			type: markerType,
			content: itemContentLines.join("\n").trim(),
			contentLines: itemContentLines,
			raw: itemLines.join("\n")
		});
		consumed = nextLineIndex;
		currentLineIndex = nextLineIndex;
	}
	return [listItems, consumed];
}
const PLAIN_TEXT_ORDERED_LIST_LINE_REGEX = new RegExp(`^(${ORDERED_LIST_MARKER_PATTERN})([.)])\\s+(.+)$`);
/**
* Parse plain-text pasted ordered list lines into JSONContent, or null if not a typed list.
*/
function parsePlainTextOrderedListPaste(text) {
	const lines = text.split("\n").filter((l) => l.trim().length > 0);
	if (lines.length === 0) return null;
	const parsedItems = [];
	for (const line of lines) {
		const match = line.trim().match(PLAIN_TEXT_ORDERED_LIST_LINE_REGEX);
		if (!match) return null;
		parsedItems.push({
			marker: match[1],
			content: match[3]
		});
	}
	if (!areOrderedListMarkersSequential(parsedItems.map((item) => item.marker))) return null;
	return {
		type: "orderedList",
		attrs: buildOrderedListAttrsFromMarker(parsedItems[0].marker),
		content: parsedItems.map((item) => ({
			type: "listItem",
			content: [{
				type: "paragraph",
				content: [{
					type: "text",
					text: item.content
				}]
			}]
		}))
	};
}
/**
* Recursively builds a nested structure from a flat array of list items
* based on their indentation levels. Creates proper markdown tokens with
* nested lists where appropriate.
*
* @param items - Flat array of list items with indentation info
* @param baseIndent - The indentation level to process at this recursion level
* @param lexer - Markdown lexer for parsing inline and block content
* @returns Array of list_item tokens with proper nesting
*/
function buildNestedStructure(items, baseIndent, lexer) {
	const result = [];
	let currentIndex = 0;
	while (currentIndex < items.length) {
		const item = items[currentIndex];
		if (item.indent === baseIndent) {
			const { paragraphLines, blockLines } = splitItemContent(item.contentLines);
			const mainText = paragraphLines.join("\n").trim();
			const tokens = [];
			if (mainText) tokens.push({
				type: "paragraph",
				raw: mainText,
				tokens: lexer.inlineTokens(mainText)
			});
			const additionalContent = blockLines.join("\n").trim();
			if (additionalContent) {
				const blockTokens = lexer.blockTokens(additionalContent);
				tokens.push(...blockTokens);
			}
			let lookAheadIndex = currentIndex + 1;
			const nestedItems = [];
			while (lookAheadIndex < items.length && items[lookAheadIndex].indent > baseIndent) {
				nestedItems.push(items[lookAheadIndex]);
				lookAheadIndex += 1;
			}
			if (nestedItems.length > 0) {
				const nestedListItems = buildNestedStructure(nestedItems, Math.min(...nestedItems.map((nestedItem) => nestedItem.indent)), lexer);
				tokens.push({
					type: "list",
					ordered: true,
					start: nestedItems[0].number,
					typeMarker: nestedItems[0].type,
					items: nestedListItems,
					raw: nestedItems.map((nestedItem) => nestedItem.raw).join("\n")
				});
			}
			result.push({
				type: "list_item",
				raw: item.raw,
				tokens
			});
			currentIndex = lookAheadIndex;
		} else currentIndex += 1;
	}
	return result;
}
/**
* Parses markdown list item tokens into Tiptap JSONContent structure,
* ensuring text content is properly wrapped in paragraph nodes.
*
* @param items - Array of markdown tokens representing list items
* @param helpers - Markdown parse helpers for recursive parsing
* @returns Array of listItem JSONContent nodes
*/
function parseListItems(items, helpers) {
	return items.map((item) => {
		if (item.type !== "list_item") return helpers.parseChildren([item])[0];
		const content = [];
		if (item.tokens && item.tokens.length > 0) item.tokens.forEach((itemToken) => {
			if (itemToken.type === "paragraph" || itemToken.type === "list" || itemToken.type === "blockquote" || itemToken.type === "code") content.push(...helpers.parseChildren([itemToken]));
			else if (itemToken.type === "text" && itemToken.tokens) {
				const inlineContent = helpers.parseChildren([itemToken]);
				content.push({
					type: "paragraph",
					content: inlineContent
				});
			} else {
				const parsed = helpers.parseChildren([itemToken]);
				if (parsed.length > 0) content.push(...parsed);
			}
		});
		return {
			type: "listItem",
			content
		};
	});
}
//#endregion
//#region src/ordered-list/ordered-list.ts
const ListItemName = "listItem";
const TextStyleName = "textStyle";
/**
* Matches an ordered list to a 1. on input (or any number followed by a dot).
*/
const orderedListInputRegex = /^(\d+)\.\s$/;
/**
* Maps CSS list-style-type values to HTML type attribute values.
* Google Docs and Word often use CSS instead of the HTML type attribute.
*/
function cssListStyleTypeToHtmlType(style) {
	const match = style.match(/list-style-type\s*:\s*([^;]+)/i);
	if (!match) return null;
	switch (match[1].trim().toLowerCase()) {
		case "upper-roman": return "I";
		case "lower-roman": return "i";
		case "upper-alpha":
		case "upper-latin": return "A";
		case "lower-alpha":
		case "lower-latin": return "a";
		default: return null;
	}
}
/**
* This extension allows you to create ordered lists.
* This requires the ListItem extension
* @see https://www.tiptap.dev/api/nodes/ordered-list
* @see https://www.tiptap.dev/api/nodes/list-item
*/
const OrderedList = Node.create({
	name: "orderedList",
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
	addAttributes() {
		return {
			start: {
				default: 1,
				parseHTML: (element) => {
					return element.hasAttribute("start") ? parseInt(element.getAttribute("start") || "", 10) : 1;
				}
			},
			type: {
				default: null,
				parseHTML: (element) => {
					const htmlType = element.getAttribute("type");
					if (htmlType) return htmlType;
					const style = element.getAttribute("style");
					if (style) {
						const mappedFromOl = cssListStyleTypeToHtmlType(style);
						if (mappedFromOl) return mappedFromOl;
					}
					const firstLi = element.querySelector("li");
					if (firstLi) {
						const liStyle = firstLi.getAttribute("style");
						if (liStyle) {
							const mappedFromLi = cssListStyleTypeToHtmlType(liStyle);
							if (mappedFromLi) return mappedFromLi;
						}
					}
					return null;
				}
			}
		};
	},
	parseHTML() {
		return [{ tag: "ol" }];
	},
	renderHTML({ HTMLAttributes }) {
		const { start, type, ...attributesWithoutType } = HTMLAttributes;
		const attrs = mergeAttributes(this.options.HTMLAttributes, attributesWithoutType);
		if (start !== 1) attrs.start = start;
		if (type && type !== "1") attrs.type = type;
		return [
			"ol",
			attrs,
			0
		];
	},
	markdownTokenName: "list",
	parseMarkdown: (token, helpers) => {
		if (token.type !== "list" || !token.ordered) return [];
		const startValue = token.start || 1;
		const typeValue = token.typeMarker;
		const content = token.items ? parseListItems(token.items, helpers) : [];
		const attrs = {};
		if (startValue !== 1) attrs.start = startValue;
		if (typeValue) attrs.type = typeValue;
		if (Object.keys(attrs).length > 0) return {
			type: "orderedList",
			attrs,
			content
		};
		return {
			type: "orderedList",
			content
		};
	},
	renderMarkdown: (node, h) => {
		if (!node.content) return "";
		return h.renderChildren(node.content, "\n");
	},
	markdownTokenizer: {
		name: "orderedList",
		level: "block",
		start: () => -1,
		tokenize: (src, _tokens, lexer) => {
			var _listItems$, _listItems$2;
			const lines = src.split("\n");
			const [listItems, consumed] = collectOrderedListItems(lines);
			if (listItems.length === 0) return;
			const items = buildNestedStructure(listItems, listItems[0].indent, lexer);
			if (items.length === 0) return;
			return {
				type: "list",
				ordered: true,
				start: ((_listItems$ = listItems[0]) === null || _listItems$ === void 0 ? void 0 : _listItems$.number) || 1,
				typeMarker: (_listItems$2 = listItems[0]) === null || _listItems$2 === void 0 ? void 0 : _listItems$2.type,
				items,
				raw: lines.slice(0, consumed).join("\n")
			};
		}
	},
	markdownOptions: { indentsContent: true },
	addCommands() {
		return { toggleOrderedList: () => ({ commands, chain }) => {
			if (this.options.keepAttributes) return chain().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(ListItemName, this.editor.getAttributes(TextStyleName)).run();
			return commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks);
		} };
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-7": () => this.editor.commands.toggleOrderedList() };
	},
	addProseMirrorPlugins() {
		return [new Plugin({ props: { handlePaste: (view, event) => {
			var _event$clipboardData, _event$clipboardData2;
			const html = (_event$clipboardData = event.clipboardData) === null || _event$clipboardData === void 0 ? void 0 : _event$clipboardData.getData("text/html");
			if (html === null || html === void 0 ? void 0 : html.trim()) return false;
			const text = (_event$clipboardData2 = event.clipboardData) === null || _event$clipboardData2 === void 0 ? void 0 : _event$clipboardData2.getData("text/plain");
			if (!text) return false;
			const orderedListContent = parsePlainTextOrderedListPaste(text);
			if (!orderedListContent) return false;
			try {
				const orderedListNode = view.state.schema.nodeFromJSON(orderedListContent);
				const tr = view.state.tr.replaceSelectionWith(orderedListNode);
				view.dispatch(tr);
				return true;
			} catch {
				return false;
			}
		} } })];
	},
	addInputRules() {
		const joinPredicate = (match, node) => {
			return (!node.attrs.type || node.attrs.type === "1") && node.childCount + node.attrs.start === +match[1];
		};
		let inputRule = wrappingInputRule({
			find: orderedListInputRegex,
			type: this.type,
			getAttributes: (match) => ({ start: +match[1] }),
			joinPredicate
		});
		if (this.options.keepMarks || this.options.keepAttributes) inputRule = wrappingInputRule({
			find: orderedListInputRegex,
			type: this.type,
			keepMarks: this.options.keepMarks,
			keepAttributes: this.options.keepAttributes,
			getAttributes: (match) => ({
				start: +match[1],
				...this.editor.getAttributes(TextStyleName)
			}),
			joinPredicate,
			editor: this.editor
		});
		return [inputRule];
	}
});
//#endregion
export { ORDERED_LIST_MARKER_PATTERN, OrderedList, areOrderedListMarkersSequential, buildOrderedListAttrsFromMarker, detectMarkerType, getListMarker, markerToStart, orderedListInputRegex, parseListMarker, parsePlainTextOrderedListPaste, toRoman, toRomanUpper };

//# sourceMappingURL=index.js.map