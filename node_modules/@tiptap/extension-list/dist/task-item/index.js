import { Extension, Node, getRenderedAttributes, mergeAttributes, renderNestedMarkdownContent, wrappingInputRule } from "@tiptap/core";
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
//#region src/task-item/task-item.ts
/**
* Matches a task item to a - [ ] on input.
*/
const inputRegex = /^\s*(\[([( |x])?\])\s$/;
/**
* Hides the checkbox label visually while keeping it in the accessibility tree.
*/
const visuallyHiddenStyle = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
const getCheckboxLabel = (node, checked, a11y) => {
	var _a11y$checkboxLabel;
	return (a11y === null || a11y === void 0 || (_a11y$checkboxLabel = a11y.checkboxLabel) === null || _a11y$checkboxLabel === void 0 ? void 0 : _a11y$checkboxLabel.call(a11y, node, checked)) || `Task item checkbox for ${node.textContent || "empty task item"}`;
};
/**
* This extension allows you to create task items.
* @see https://www.tiptap.dev/api/nodes/task-item
*/
const TaskItem = Node.create({
	name: "taskItem",
	addOptions() {
		return {
			nested: false,
			HTMLAttributes: {},
			taskListTypeName: "taskList",
			a11y: void 0
		};
	},
	content() {
		return this.options.nested ? "paragraph block*" : "paragraph+";
	},
	defining: true,
	addAttributes() {
		return { checked: {
			default: false,
			keepOnSplit: false,
			parseHTML: (element) => {
				const dataChecked = element.getAttribute("data-checked");
				return dataChecked === "" || dataChecked === "true";
			},
			renderHTML: (attributes) => ({ "data-checked": attributes.checked })
		} };
	},
	parseHTML() {
		return [{
			tag: `li[data-type="${this.name}"]`,
			priority: 51,
			contentElement: (element) => {
				var _element$querySelecto;
				return (_element$querySelecto = element.querySelector("div")) !== null && _element$querySelecto !== void 0 ? _element$querySelecto : element;
			}
		}];
	},
	renderHTML({ node, HTMLAttributes }) {
		return [
			"li",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { "data-type": this.name }),
			[
				"label",
				["input", {
					type: "checkbox",
					checked: node.attrs.checked ? "checked" : null
				}],
				["span"]
			],
			["div", 0]
		];
	},
	parseMarkdown: (token, h) => {
		const content = [];
		if (token.tokens && token.tokens.length > 0) content.push(h.createNode("paragraph", {}, h.parseInline(token.tokens)));
		else if (token.text) content.push(h.createNode("paragraph", {}, [h.createNode("text", { text: token.text })]));
		else content.push(h.createNode("paragraph", {}, []));
		if (token.nestedTokens && token.nestedTokens.length > 0) {
			const nestedContent = h.parseChildren(token.nestedTokens);
			content.push(...nestedContent);
		}
		return h.createNode("taskItem", { checked: token.checked || false }, content);
	},
	renderMarkdown: (node, h) => {
		var _node$attrs;
		const prefix = `- [${((_node$attrs = node.attrs) === null || _node$attrs === void 0 ? void 0 : _node$attrs.checked) ? "x" : " "}] `;
		return renderNestedMarkdownContent(node, h, prefix);
	},
	addExtensions() {
		if (!this.options.nested) return [];
		return [createBranchingListDeleteKeymap(this.name, [this.options.taskListTypeName])];
	},
	addKeyboardShortcuts() {
		const shortcuts = {
			Enter: () => this.editor.commands.splitListItem(this.name),
			"Shift-Tab": () => this.editor.commands.liftListItem(this.name)
		};
		if (!this.options.nested) return shortcuts;
		return {
			...shortcuts,
			Tab: () => this.editor.commands.sinkListItem(this.name)
		};
	},
	addNodeView() {
		return ({ node, HTMLAttributes, getPos, editor }) => {
			const listItem = document.createElement("li");
			const checkboxWrapper = document.createElement("label");
			const checkboxStyler = document.createElement("span");
			const checkbox = document.createElement("input");
			const content = document.createElement("div");
			checkboxStyler.style.cssText = visuallyHiddenStyle;
			const updateA11Y = (currentNode) => {
				const label = getCheckboxLabel(currentNode, currentNode.attrs.checked, this.options.a11y);
				checkbox.setAttribute("aria-label", label);
				checkboxStyler.textContent = label;
			};
			updateA11Y(node);
			checkboxWrapper.contentEditable = "false";
			checkbox.type = "checkbox";
			checkbox.addEventListener("mousedown", (event) => event.preventDefault());
			checkbox.addEventListener("change", (event) => {
				if (!editor.isEditable && !this.options.onReadOnlyChecked) {
					checkbox.checked = !checkbox.checked;
					return;
				}
				const { checked } = event.target;
				if (editor.isEditable && typeof getPos === "function") editor.chain().focus(void 0, { scrollIntoView: false }).command(({ tr }) => {
					const position = getPos();
					if (typeof position !== "number") return false;
					const currentNode = tr.doc.nodeAt(position);
					tr.setNodeMarkup(position, void 0, {
						...currentNode === null || currentNode === void 0 ? void 0 : currentNode.attrs,
						checked
					});
					return true;
				}).run();
				if (!editor.isEditable && this.options.onReadOnlyChecked) {
					if (!this.options.onReadOnlyChecked(node, checked)) checkbox.checked = !checkbox.checked;
				}
			});
			Object.entries(this.options.HTMLAttributes).forEach(([key, value]) => {
				listItem.setAttribute(key, value);
			});
			listItem.dataset.checked = node.attrs.checked;
			checkbox.checked = node.attrs.checked;
			checkboxWrapper.append(checkbox, checkboxStyler);
			listItem.append(checkboxWrapper, content);
			Object.entries(HTMLAttributes).forEach(([key, value]) => {
				listItem.setAttribute(key, value);
			});
			let prevRenderedAttributeKeys = new Set(Object.keys(HTMLAttributes));
			return {
				dom: listItem,
				contentDOM: content,
				update: (updatedNode) => {
					if (updatedNode.type !== this.type) return false;
					listItem.dataset.checked = updatedNode.attrs.checked;
					checkbox.checked = updatedNode.attrs.checked;
					updateA11Y(updatedNode);
					const extensionAttributes = editor.extensionManager.attributes;
					const newHTMLAttributes = getRenderedAttributes(updatedNode, extensionAttributes);
					const newKeys = new Set(Object.keys(newHTMLAttributes));
					const staticAttrs = this.options.HTMLAttributes;
					prevRenderedAttributeKeys.forEach((key) => {
						if (!newKeys.has(key)) {
							if (key in staticAttrs) listItem.setAttribute(key, staticAttrs[key]);
							else listItem.removeAttribute(key);
						}
					});
					Object.entries(newHTMLAttributes).forEach(([key, value]) => {
						if (value === null || value === void 0) {
							if (key in staticAttrs) listItem.setAttribute(key, staticAttrs[key]);
							else listItem.removeAttribute(key);
						} else listItem.setAttribute(key, value);
					});
					prevRenderedAttributeKeys = newKeys;
					return true;
				}
			};
		};
	},
	addInputRules() {
		return [wrappingInputRule({
			find: inputRegex,
			type: this.type,
			getAttributes: (match) => ({ checked: match[match.length - 1] === "x" })
		})];
	}
});
//#endregion
export { TaskItem, inputRegex };

//# sourceMappingURL=index.js.map