import { Extension, Node, mergeAttributes, renderNestedMarkdownContent } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
//#region src/helpers/getBranchingNestedListAtCursor.ts
/**
* Resolves a branching nested list immediately after the cursor when the selection is
* collapsed at the end of a textblock inside a list item.
*
* @param state - The editor state to inspect.
* @param itemName - The list item node name (for example `listItem` or `taskItem`).
* @param wrapperNames - List wrapper node names (for example `bulletList` and `orderedList`).
* @returns Resolved positions and nodes for hoisting, or `null` when not applicable.
*
* @example
* ```ts
* const context = getBranchingNestedListAtCursor(editor.state, 'listItem', [
*   'bulletList',
*   'orderedList',
* ])
*
* if (context) {
*   // cursor is at the end of Item 1 before a branching nested sublist
* }
* ```
*/
const getBranchingNestedListAtCursor = (state, itemName, wrapperNames) => {
	const { selection } = state;
	if (!selection.empty) return null;
	const { $from } = selection;
	if (!$from.parent.isTextblock) return null;
	if ($from.parentOffset !== $from.parent.content.size) return null;
	let listItemDepth = -1;
	for (let depth = $from.depth; depth > 0; depth -= 1) if ($from.node(depth).type.name === itemName) {
		listItemDepth = depth;
		break;
	}
	if (listItemDepth < 0) return null;
	const listItem = $from.node(listItemDepth);
	const indexInListItem = $from.index(listItemDepth);
	if (indexInListItem + 1 >= listItem.childCount) return null;
	const nextChild = listItem.child(indexInListItem + 1);
	if (!wrapperNames.includes(nextChild.type.name)) return null;
	const itemType = state.schema.nodes[itemName];
	let hasBranching = false;
	nextChild.forEach((child) => {
		if (child.type === itemType && child.childCount > 1) hasBranching = true;
	});
	if (!hasBranching) return null;
	const nodeAfter = state.doc.resolve($from.after()).nodeAfter;
	if (!nodeAfter || !wrapperNames.includes(nodeAfter.type.name)) return null;
	const items = [];
	nodeAfter.forEach((child) => {
		items.push(child);
	});
	if (items.length === 0) return null;
	return {
		listItemDepth,
		nestedList: nodeAfter,
		nestedListPos: $from.after(),
		insertPos: $from.after(listItemDepth),
		items
	};
};
//#endregion
//#region src/helpers/hoistBranchingNestedList.ts
/**
* Hoists all list items from a branching nested list after the cursor into the parent list.
*
* Use this when `joinForward` cannot restructure a nested list that contains list items
* with sublists (see issue #6906).
*
* @param state - The editor state to transform.
* @param dispatch - Optional dispatch function for the transaction.
* @param itemName - The list item node name (for example `listItem` or `taskItem`).
* @param wrapperNames - List wrapper node names (for example `bulletList` and `orderedList`).
* @returns `true` when the nested list was hoisted, otherwise `false`.
*
* @example
* ```ts
* // Cursor at the end of "Item 1" before a nested list with branching items.
* hoistBranchingNestedList(editor.state, editor.view.dispatch, 'listItem', [
*   'bulletList',
*   'orderedList',
* ])
* ```
*/
const hoistBranchingNestedList = (state, dispatch, itemName, wrapperNames) => {
	const context = getBranchingNestedListAtCursor(state, itemName, wrapperNames);
	if (!context) return false;
	const { selection } = state;
	const { nestedList, nestedListPos, insertPos, items } = context;
	const tr = state.tr;
	tr.delete(nestedListPos, nestedListPos + nestedList.nodeSize);
	const mappedInsertPos = tr.mapping.map(insertPos);
	tr.insert(mappedInsertPos, Fragment.from(items));
	tr.setSelection(selection.map(tr.doc, tr.mapping));
	if (dispatch) dispatch(tr);
	return true;
};
//#endregion
//#region src/helpers/handleDeleteBranchingNestedList.ts
/**
* Handles Delete for a list item when a branching nested sublist follows the cursor.
*
* @param editor - The editor instance whose state should be updated.
* @param itemName - The list item node name (for example `listItem` or `taskItem`).
* @param wrapperNames - List wrapper node names (for example `bulletList` and `orderedList`).
* @returns `true` when the nested list was hoisted, otherwise `false`.
*
* @example
* ```ts
* Delete: () =>
*   handleDeleteBranchingNestedList(editor, 'listItem', ['bulletList', 'orderedList']),
* ```
*/
const handleDeleteBranchingNestedList = (editor, itemName, wrapperNames) => {
	return hoistBranchingNestedList(editor.state, editor.view.dispatch, itemName, wrapperNames);
};
//#endregion
//#region src/helpers/createBranchingListDeleteKeymap.ts
/**
* Creates a high-priority keymap extension that handles Delete for branching nested lists.
* Kept separate from the list item node so Enter/Tab shortcuts keep their default priority.
*/
const createBranchingListDeleteKeymap = (itemName, wrapperNames) => {
	return Extension.create({
		name: `${itemName}BranchingDeleteKeymap`,
		priority: 101,
		addKeyboardShortcuts() {
			const handleDelete = () => handleDeleteBranchingNestedList(this.editor, itemName, wrapperNames);
			return {
				Delete: handleDelete,
				"Mod-Delete": handleDelete
			};
		}
	});
};
//#endregion
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
String.raw`\d+|[ivxlcdmIVXLCDM]+|${"[a-zA-Z]{1,2}"}`;
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
function toRomanAlpha(num) {
	if (num <= 26) return ALPHA_NUMERALS[num - 1];
	const first = Math.floor((num - 1) / 26) - 1;
	const second = (num - 1) % 26;
	if (first < 0) return ALPHA_NUMERALS[second];
	return ALPHA_NUMERALS[first] + ALPHA_NUMERALS[second];
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
//#region src/item/list-item.ts
function isSameLineOrderedListToken(token) {
	var _token$tokens, _token$tokens2;
	const nestedToken = (_token$tokens = token.tokens) === null || _token$tokens === void 0 ? void 0 : _token$tokens[0];
	return Boolean(token.text && ((_token$tokens2 = token.tokens) === null || _token$tokens2 === void 0 ? void 0 : _token$tokens2.length) === 1 && (nestedToken === null || nestedToken === void 0 ? void 0 : nestedToken.type) === "list" && nestedToken.ordered && nestedToken.raw === token.text);
}
function parseSameLineOrderedListText(text, helpers) {
	if (helpers.tokenizeInline) return helpers.parseInline(helpers.tokenizeInline(text));
	return helpers.parseInline([{
		type: "text",
		raw: text,
		text
	}]);
}
/**
* This extension allows you to create list items.
* @see https://www.tiptap.dev/api/nodes/list-item
*/
const ListItem = Node.create({
	name: "listItem",
	addOptions() {
		return {
			HTMLAttributes: {},
			bulletListTypeName: "bulletList",
			orderedListTypeName: "orderedList"
		};
	},
	content: "paragraph block*",
	defining: true,
	parseHTML() {
		return [{ tag: "li" }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"li",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
			0
		];
	},
	markdownTokenName: "list_item",
	parseMarkdown: (token, helpers) => {
		var _helpers$parseBlockCh;
		if (token.type !== "list_item") return [];
		const parseBlockChildren = (_helpers$parseBlockCh = helpers.parseBlockChildren) !== null && _helpers$parseBlockCh !== void 0 ? _helpers$parseBlockCh : helpers.parseChildren;
		let content = [];
		if (token.tokens && token.tokens.length > 0) {
			if (isSameLineOrderedListToken(token)) return {
				type: "listItem",
				content: [{
					type: "paragraph",
					content: parseSameLineOrderedListText(token.text || "", helpers)
				}]
			};
			if (token.tokens.some((t) => t.type === "paragraph")) content = parseBlockChildren(token.tokens);
			else {
				const firstToken = token.tokens[0];
				if (firstToken && firstToken.type === "text" && firstToken.tokens && firstToken.tokens.length > 0) {
					content = [{
						type: "paragraph",
						content: helpers.parseInline(firstToken.tokens)
					}];
					if (token.tokens.length > 1) {
						const additionalContent = parseBlockChildren(token.tokens.slice(1));
						content.push(...additionalContent);
					}
				} else content = parseBlockChildren(token.tokens);
			}
		}
		if (content.length === 0) content = [{
			type: "paragraph",
			content: []
		}];
		return {
			type: "listItem",
			content
		};
	},
	renderMarkdown: (node, h, ctx) => {
		return renderNestedMarkdownContent(node, h, (context) => {
			if (context.parentType === "bulletList") return "- ";
			if (context.parentType === "orderedList") {
				var _context$meta, _context$meta2;
				const start = ((_context$meta = context.meta) === null || _context$meta === void 0 || (_context$meta = _context$meta.parentAttrs) === null || _context$meta === void 0 ? void 0 : _context$meta.start) || 1;
				return getListMarker((_context$meta2 = context.meta) === null || _context$meta2 === void 0 || (_context$meta2 = _context$meta2.parentAttrs) === null || _context$meta2 === void 0 ? void 0 : _context$meta2.type, start - 1 + (context.index || 0), ". ");
			}
			return "- ";
		}, ctx, { alignNestedToPrefix: (ctx === null || ctx === void 0 ? void 0 : ctx.parentType) === "orderedList" });
	},
	addExtensions() {
		return [createBranchingListDeleteKeymap(this.name, [this.options.bulletListTypeName, this.options.orderedListTypeName])];
	},
	addKeyboardShortcuts() {
		return {
			Enter: () => this.editor.commands.splitListItem(this.name),
			Tab: () => this.editor.commands.sinkListItem(this.name),
			"Shift-Tab": () => this.editor.commands.liftListItem(this.name)
		};
	}
});
//#endregion
export { ListItem };

//# sourceMappingURL=index.js.map