Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
let _tiptap_core = require("@tiptap/core");
let _tiptap_pm_model = require("@tiptap/pm/model");
let _tiptap_pm_state = require("@tiptap/pm/state");
//#region src/keymap/listHelpers/findListItemPos.ts
const findListItemPos = (typeOrName, state) => {
	const { $from } = state.selection;
	const nodeType = (0, _tiptap_core.getNodeType)(typeOrName, state.schema);
	let currentNode = null;
	let currentDepth = $from.depth;
	let currentPos = $from.pos;
	let targetDepth = null;
	while (currentDepth > 0 && targetDepth === null) {
		currentNode = $from.node(currentDepth);
		if (currentNode.type === nodeType) targetDepth = currentDepth;
		else {
			currentDepth -= 1;
			currentPos -= 1;
		}
	}
	if (targetDepth === null) return null;
	return {
		$pos: state.doc.resolve(currentPos),
		depth: targetDepth
	};
};
//#endregion
//#region src/keymap/listHelpers/getNextListDepth.ts
const getNextListDepth = (typeOrName, state) => {
	const listItemPos = findListItemPos(typeOrName, state);
	if (!listItemPos) return false;
	const [, depth] = (0, _tiptap_core.getNodeAtPosition)(state, typeOrName, listItemPos.$pos.pos + 4);
	return depth;
};
//#endregion
//#region src/keymap/listHelpers/hasListBefore.ts
const hasListBefore = (editorState, name, parentListTypes) => {
	const { $anchor } = editorState.selection;
	const previousNodePos = Math.max(0, $anchor.pos - 2);
	const previousNode = editorState.doc.resolve(previousNodePos).node();
	if (!previousNode || !parentListTypes.includes(previousNode.type.name)) return false;
	return true;
};
//#endregion
//#region src/keymap/listHelpers/handleBackspace.ts
const handleBackspace = (editor, name, parentListTypes) => {
	if (editor.commands.undoInputRule()) return true;
	if (editor.state.selection.from !== editor.state.selection.to) return false;
	if (!(0, _tiptap_core.isNodeActive)(editor.state, name) && hasListBefore(editor.state, name, parentListTypes)) {
		const { $anchor } = editor.state.selection;
		const $listPos = editor.state.doc.resolve($anchor.before() - 1);
		const listDescendants = [];
		$listPos.node().descendants((node, pos) => {
			if (node.type.name === name) listDescendants.push({
				node,
				pos
			});
		});
		const lastItem = listDescendants.at(-1);
		if (!lastItem) return false;
		const $lastItemPos = editor.state.doc.resolve($listPos.start() + lastItem.pos + 1);
		return editor.chain().cut({
			from: $anchor.start() - 1,
			to: $anchor.end() + 1
		}, $lastItemPos.end()).joinForward().run();
	}
	if (!(0, _tiptap_core.isNodeActive)(editor.state, name)) return false;
	if (!(0, _tiptap_core.isAtStartOfNode)(editor.state)) return false;
	const { $from } = editor.state.selection;
	const itemDepth = $from.depth - 1;
	if ($from.node(itemDepth).type !== editor.schema.nodes[name] || $from.index(itemDepth) !== 0) return false;
	return editor.chain().liftListItem(name).run();
};
//#endregion
//#region src/keymap/listHelpers/nextListIsDeeper.ts
const nextListIsDeeper = (typeOrName, state) => {
	const listDepth = getNextListDepth(typeOrName, state);
	const listItemPos = findListItemPos(typeOrName, state);
	if (!listItemPos || !listDepth) return false;
	if (listDepth > listItemPos.depth) return true;
	return false;
};
//#endregion
//#region src/keymap/listHelpers/nextListIsHigher.ts
const nextListIsHigher = (typeOrName, state) => {
	const listDepth = getNextListDepth(typeOrName, state);
	const listItemPos = findListItemPos(typeOrName, state);
	if (!listItemPos || !listDepth) return false;
	if (listDepth < listItemPos.depth) return true;
	return false;
};
//#endregion
//#region src/keymap/listHelpers/handleDelete.ts
const handleDelete = (editor, name) => {
	if (!(0, _tiptap_core.isNodeActive)(editor.state, name)) return false;
	if (!(0, _tiptap_core.isAtEndOfNode)(editor.state, name)) return false;
	const { selection } = editor.state;
	const { $from, $to } = selection;
	if (!selection.empty && $from.sameParent($to)) return false;
	if (nextListIsDeeper(name, editor.state)) return editor.chain().focus(editor.state.selection.from + 4).lift(name).joinBackward().run();
	if (nextListIsHigher(name, editor.state)) return editor.chain().joinForward().joinBackward().run();
	return editor.commands.joinItemForward();
};
//#endregion
//#region src/keymap/listHelpers/handleTab.ts
const handleTab = (editor, name, parentListTypes) => {
	const { state } = editor;
	const { selection } = state;
	if (!selection.empty) return false;
	const { $from } = selection;
	if ($from.parentOffset !== 0) return false;
	if (!$from.parent.isTextblock) return false;
	if ((0, _tiptap_core.isNodeActive)(state, name)) return false;
	const previous = (0, _tiptap_core.getPreviousBlockSibling)($from);
	if (!previous || !parentListTypes.includes(previous.type.name)) return false;
	const lastItem = previous.lastChild;
	if (!lastItem || lastItem.type.name !== name) return false;
	const block = $from.parent;
	if (!lastItem.canReplace(lastItem.childCount, lastItem.childCount, _tiptap_pm_model.Fragment.from(block))) return false;
	const blockStart = $from.before();
	const blockEnd = $from.after();
	const insideLastItemEnd = blockStart - 2;
	return editor.commands.command(({ tr, dispatch }) => {
		if (dispatch) {
			tr.delete(blockStart, blockEnd).insert(insideLastItemEnd, _tiptap_pm_model.Fragment.from(block));
			tr.setSelection(_tiptap_pm_state.TextSelection.create(tr.doc, insideLastItemEnd + 1));
			tr.scrollIntoView();
		}
		return true;
	});
};
//#endregion
//#region src/keymap/listHelpers/hasListItemAfter.ts
const hasListItemAfter = (typeOrName, state) => {
	var _$targetPos$nodeAfter;
	const { $anchor } = state.selection;
	const $targetPos = state.doc.resolve($anchor.pos - $anchor.parentOffset - 2);
	if ($targetPos.index() === $targetPos.parent.childCount - 1) return false;
	if (((_$targetPos$nodeAfter = $targetPos.nodeAfter) === null || _$targetPos$nodeAfter === void 0 ? void 0 : _$targetPos$nodeAfter.type.name) !== typeOrName) return false;
	return true;
};
//#endregion
//#region src/keymap/listHelpers/hasListItemBefore.ts
const hasListItemBefore = (typeOrName, state) => {
	var _$targetPos$nodeBefor;
	const { $anchor } = state.selection;
	const $targetPos = state.doc.resolve($anchor.pos - 2);
	if ($targetPos.index() === 0) return false;
	if (((_$targetPos$nodeBefor = $targetPos.nodeBefore) === null || _$targetPos$nodeBefor === void 0 ? void 0 : _$targetPos$nodeBefor.type.name) !== typeOrName) return false;
	return true;
};
//#endregion
//#region src/keymap/listHelpers/listItemHasSubList.ts
const listItemHasSubList = (typeOrName, state, node) => {
	if (!node) return false;
	const nodeType = (0, _tiptap_core.getNodeType)(typeOrName, state.schema);
	let hasSubList = false;
	node.descendants((child) => {
		if (child.type === nodeType) hasSubList = true;
	});
	return hasSubList;
};
//#endregion
//#region src/keymap/listHelpers/index.ts
var listHelpers_exports = /* @__PURE__ */ __exportAll({
	findListItemPos: () => findListItemPos,
	getNextListDepth: () => getNextListDepth,
	handleBackspace: () => handleBackspace,
	handleDelete: () => handleDelete,
	handleTab: () => handleTab,
	hasListBefore: () => hasListBefore,
	hasListItemAfter: () => hasListItemAfter,
	hasListItemBefore: () => hasListItemBefore,
	listItemHasSubList: () => listItemHasSubList,
	nextListIsDeeper: () => nextListIsDeeper,
	nextListIsHigher: () => nextListIsHigher
});
//#endregion
//#region src/keymap/list-keymap.ts
/**
* This extension registers custom keymaps to change the behaviour of the backspace and delete keys.
* By default Prosemirror keyhandling will always lift or sink items so paragraphs are joined into
* the adjacent or previous list item. This extension will prevent this behaviour and instead will
* try to join paragraphs from two list items into a single list item.
* @see https://www.tiptap.dev/api/extensions/list-keymap
*/
const ListKeymap = _tiptap_core.Extension.create({
	name: "listKeymap",
	addOptions() {
		return { listTypes: [{
			itemName: "listItem",
			wrapperNames: ["bulletList", "orderedList"]
		}, {
			itemName: "taskItem",
			wrapperNames: ["taskList"]
		}] };
	},
	addKeyboardShortcuts() {
		return {
			Delete: ({ editor }) => {
				let handled = false;
				this.options.listTypes.forEach(({ itemName }) => {
					if (editor.state.schema.nodes[itemName] === void 0) return;
					if (handleDelete(editor, itemName)) handled = true;
				});
				return handled;
			},
			"Mod-Delete": ({ editor }) => {
				let handled = false;
				this.options.listTypes.forEach(({ itemName }) => {
					if (editor.state.schema.nodes[itemName] === void 0) return;
					if (handleDelete(editor, itemName)) handled = true;
				});
				return handled;
			},
			Backspace: ({ editor }) => {
				let handled = false;
				this.options.listTypes.forEach(({ itemName, wrapperNames }) => {
					if (editor.state.schema.nodes[itemName] === void 0) return;
					if (handleBackspace(editor, itemName, wrapperNames)) handled = true;
				});
				return handled;
			},
			"Mod-Backspace": ({ editor }) => {
				let handled = false;
				this.options.listTypes.forEach(({ itemName, wrapperNames }) => {
					if (editor.state.schema.nodes[itemName] === void 0) return;
					if (handleBackspace(editor, itemName, wrapperNames)) handled = true;
				});
				return handled;
			},
			Tab: ({ editor }) => {
				for (const { itemName, wrapperNames } of this.options.listTypes) {
					if (editor.state.schema.nodes[itemName] === void 0) continue;
					if (handleTab(editor, itemName, wrapperNames)) return true;
				}
				return false;
			}
		};
	}
});
//#endregion
exports.ListKeymap = ListKeymap;
Object.defineProperty(exports, "listHelpers", {
	enumerable: true,
	get: function() {
		return listHelpers_exports;
	}
});

//# sourceMappingURL=index.cjs.map