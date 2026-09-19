Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _tiptap_core = require("@tiptap/core");
let _tiptap_pm_state = require("@tiptap/pm/state");
let _tiptap_pm_dropcursor = require("@tiptap/pm/dropcursor");
let _tiptap_pm_view = require("@tiptap/pm/view");
let _tiptap_pm_gapcursor = require("@tiptap/pm/gapcursor");
let _tiptap_pm_history = require("@tiptap/pm/history");
//#region src/character-count/character-count.ts
/**
* This extension allows you to count the characters and words of your document.
* @see https://tiptap.dev/api/extensions/character-count
*/
const CharacterCount = _tiptap_core.Extension.create({
	name: "characterCount",
	addOptions() {
		return {
			limit: null,
			autoTrim: true,
			mode: "textSize",
			textCounter: (text) => text.length,
			wordCounter: (text) => text.split(" ").filter((word) => word !== "").length
		};
	},
	addStorage() {
		return {
			characters: () => 0,
			words: () => 0
		};
	},
	onBeforeCreate() {
		this.storage.characters = (options) => {
			const node = (options === null || options === void 0 ? void 0 : options.node) || this.editor.state.doc;
			if (((options === null || options === void 0 ? void 0 : options.mode) || this.options.mode) === "textSize") {
				const text = node.textBetween(0, node.content.size, void 0, " ");
				return this.options.textCounter(text);
			}
			return node.nodeSize;
		};
		this.storage.words = (options) => {
			const node = (options === null || options === void 0 ? void 0 : options.node) || this.editor.state.doc;
			const text = node.textBetween(0, node.content.size, " ", " ");
			return this.options.wordCounter(text);
		};
	},
	addProseMirrorPlugins() {
		let initialEvaluationDone = false;
		return [new _tiptap_pm_state.Plugin({
			key: new _tiptap_pm_state.PluginKey("characterCount"),
			appendTransaction: (transactions, oldState, newState) => {
				if (initialEvaluationDone) return;
				const limit = this.options.limit;
				const autoTrim = this.options.autoTrim;
				if (limit === null || limit === void 0 || limit === 0 || autoTrim === false) {
					initialEvaluationDone = true;
					return;
				}
				const initialContentSize = this.storage.characters({ node: newState.doc });
				if (initialContentSize > limit) {
					const over = initialContentSize - limit;
					const from = 0;
					const to = over;
					console.warn(`[CharacterCount] Initial content exceeded limit of ${limit} characters. Content was automatically trimmed.`);
					const tr = newState.tr.deleteRange(from, to);
					initialEvaluationDone = true;
					return tr;
				}
				initialEvaluationDone = true;
			},
			filterTransaction: (transaction, state) => {
				const limit = this.options.limit;
				if (!transaction.docChanged || limit === 0 || limit === null || limit === void 0) return true;
				const oldSize = this.storage.characters({ node: state.doc });
				const newSize = this.storage.characters({ node: transaction.doc });
				if (newSize <= limit) return true;
				if (oldSize > limit && newSize > limit && newSize <= oldSize) return true;
				if (oldSize > limit && newSize > limit && newSize > oldSize) return false;
				if (!transaction.getMeta("paste")) return false;
				const pos = transaction.selection.$head.pos;
				const from = pos - (newSize - limit);
				const to = pos;
				transaction.deleteRange(from, to);
				if (this.storage.characters({ node: transaction.doc }) > limit) return false;
				return true;
			}
		})];
	}
});
//#endregion
//#region src/drop-cursor/drop-cursor.ts
/**
* This extension allows you to add a drop cursor to your editor.
* A drop cursor is a line that appears when you drag and drop content
* in-between nodes.
* @see https://tiptap.dev/api/extensions/dropcursor
*/
const Dropcursor = _tiptap_core.Extension.create({
	name: "dropCursor",
	addOptions() {
		return {
			color: "currentColor",
			width: 1,
			class: void 0
		};
	},
	addProseMirrorPlugins() {
		return [(0, _tiptap_pm_dropcursor.dropCursor)(this.options)];
	}
});
//#endregion
//#region src/focus/focus.ts
/**
* This extension allows you to add a class to the focused node.
* @see https://www.tiptap.dev/api/extensions/focus
*/
const Focus = _tiptap_core.Extension.create({
	name: "focus",
	addOptions() {
		return {
			className: "has-focus",
			mode: "all"
		};
	},
	addProseMirrorPlugins() {
		return [new _tiptap_pm_state.Plugin({
			key: new _tiptap_pm_state.PluginKey("focus"),
			props: { decorations: ({ doc, selection }) => {
				const { isEditable, isFocused } = this.editor;
				const { anchor } = selection;
				const decorations = [];
				if (!isEditable || !isFocused) return _tiptap_pm_view.DecorationSet.create(doc, []);
				let maxLevels = 0;
				if (this.options.mode === "deepest") doc.descendants((node, pos) => {
					if (node.isText) return;
					if (!(anchor >= pos && anchor <= pos + node.nodeSize - 1)) return false;
					maxLevels += 1;
				});
				let currentLevel = 0;
				doc.descendants((node, pos) => {
					if (node.isText) return false;
					if (!(anchor >= pos && anchor <= pos + node.nodeSize - 1)) return false;
					currentLevel += 1;
					if (this.options.mode === "deepest" && maxLevels - currentLevel > 0 || this.options.mode === "shallowest" && currentLevel > 1) return this.options.mode === "deepest";
					decorations.push(_tiptap_pm_view.Decoration.node(pos, pos + node.nodeSize, { class: this.options.className }));
				});
				return _tiptap_pm_view.DecorationSet.create(doc, decorations);
			} }
		})];
	}
});
//#endregion
//#region src/gap-cursor/gap-cursor.ts
/**
* This extension allows you to add a gap cursor to your editor.
* A gap cursor is a cursor that appears when you click on a place
* where no content is present, for example inbetween nodes.
* @see https://tiptap.dev/api/extensions/gapcursor
*/
const Gapcursor = _tiptap_core.Extension.create({
	name: "gapCursor",
	addProseMirrorPlugins() {
		return [(0, _tiptap_pm_gapcursor.gapCursor)()];
	},
	extendNodeSchema(extension) {
		var _callOrReturn;
		const context = {
			name: extension.name,
			options: extension.options,
			storage: extension.storage
		};
		return { allowGapCursor: (_callOrReturn = (0, _tiptap_core.callOrReturn)((0, _tiptap_core.getExtensionField)(extension, "allowGapCursor", context))) !== null && _callOrReturn !== void 0 ? _callOrReturn : null };
	}
});
//#endregion
//#region src/placeholder/constants.ts
/** The default data attribute label */
const DEFAULT_DATA_ATTRIBUTE = "placeholder";
/** The plugin key used to store and read the placeholder decoration set */
const PLUGIN_KEY = new _tiptap_pm_state.PluginKey("tiptap__placeholder");
//#endregion
//#region src/placeholder/utils/createPlaceholderDecoration.ts
/**
* Creates a ProseMirror node decoration that applies a placeholder
* CSS class and data attribute to an empty node.
* @param options.editor - The editor instance
* @param options.pos - The position of the node in the document
* @param options.node - The ProseMirror node
* @param options.isEmptyDoc - Whether the entire document is empty
* @param options.hasAnchor - Whether the selection anchor is within the node
* @param options.dataAttribute - The data attribute name (e.g. `data-placeholder`)
* @param options.classes - CSS classes for empty nodes and the empty editor
* @param options.placeholder - The placeholder text or a function that returns it
* @returns A ProseMirror node decoration with placeholder classes and data attribute
*/
function createPlaceholderDecoration(options) {
	const { editor, placeholder, dataAttribute, pos, node, isEmptyDoc, hasAnchor, classes: { emptyNode, emptyEditor } } = options;
	const classes = [emptyNode];
	if (isEmptyDoc) classes.push(emptyEditor);
	return _tiptap_pm_view.Decoration.node(pos, pos + node.nodeSize, {
		class: classes.join(" "),
		[dataAttribute]: typeof placeholder === "function" ? placeholder({
			editor,
			node,
			pos,
			hasAnchor
		}) : placeholder
	});
}
//#endregion
//#region src/placeholder/utils/buildPlaceholderDecorations.ts
function resolveEmptyNodeClass(emptyNodeClass, props) {
	return typeof emptyNodeClass === "function" ? emptyNodeClass(props) : emptyNodeClass;
}
/**
* Scans a document range for empty textblocks that should receive placeholder
* decorations. Used by the slow path and incremental state updates.
*/
function scanRangeForDecorations({ editor, options, dataAttribute, doc, selection, from, to }) {
	const { anchor } = selection;
	const decorations = [];
	const isEmptyDoc = editor.isEmpty;
	doc.nodesBetween(from, to, (node, pos) => {
		const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
		const isEmpty = !node.isLeaf && (0, _tiptap_core.isNodeEmpty)(node);
		if (!node.type.isTextblock) return options.includeChildren;
		if ((hasAnchor || !options.showOnlyCurrent) && isEmpty) decorations.push(createPlaceholderDecoration({
			editor,
			isEmptyDoc,
			dataAttribute,
			hasAnchor,
			placeholder: options.placeholder,
			classes: {
				emptyEditor: options.emptyEditorClass,
				emptyNode: resolveEmptyNodeClass(options.emptyNodeClass, {
					editor,
					node,
					pos,
					hasAnchor
				})
			},
			node,
			pos
		}));
		return options.includeChildren;
	});
	return decorations;
}
/**
* Builds the placeholder decorations for the current document state.
* @param options.editor - The editor instance.
* @param options.options - The resolved placeholder options.
* @param options.dataAttribute - The prepared `data-*` attribute name.
* @param options.doc - The current document node.
* @param options.selection - The current selection.
* @returns A decoration set, or `null` when no placeholders should be shown.
*/
function buildPlaceholderDecorations({ editor, options, dataAttribute, doc, selection }) {
	if (!(editor.isEditable || !options.showOnlyWhenEditable)) return null;
	const { anchor } = selection;
	const decorations = [];
	const isEmptyDoc = editor.isEmpty;
	if (options.showOnlyCurrent && !options.includeChildren) {
		const resolved = doc.resolve(anchor);
		const node = resolved.depth > 0 ? resolved.node(1) : resolved.nodeAfter;
		const nodeStart = resolved.depth > 0 ? resolved.before(1) : anchor;
		if (node && node.type.isTextblock && (0, _tiptap_core.isNodeEmpty)(node)) {
			const hasAnchor = anchor >= nodeStart && anchor <= nodeStart + node.nodeSize;
			decorations.push(createPlaceholderDecoration({
				editor,
				isEmptyDoc,
				dataAttribute,
				hasAnchor,
				placeholder: options.placeholder,
				classes: {
					emptyEditor: options.emptyEditorClass,
					emptyNode: resolveEmptyNodeClass(options.emptyNodeClass, {
						editor,
						node,
						pos: nodeStart,
						hasAnchor
					})
				},
				node,
				pos: nodeStart
			}));
		}
	} else decorations.push(...scanRangeForDecorations({
		editor,
		options,
		dataAttribute,
		doc,
		selection,
		from: 0,
		to: doc.content.size
	}));
	return _tiptap_pm_view.DecorationSet.create(doc, decorations);
}
//#endregion
//#region src/placeholder/utils/resolveTopLevelRange.ts
/**
* Resolves a document position to the `[from, to)` range of its containing
* top-level block node in absolute document positions.
*/
function resolveTopLevelRange(doc, pos) {
	const resolved = doc.resolve(pos);
	if (resolved.depth === 0) {
		var _resolved$nodeAfter;
		const node = (_resolved$nodeAfter = resolved.nodeAfter) !== null && _resolved$nodeAfter !== void 0 ? _resolved$nodeAfter : resolved.nodeBefore;
		if (!node) return {
			from: pos,
			to: pos
		};
		const nodePos = resolved.nodeAfter ? pos : pos - node.nodeSize;
		return {
			from: nodePos,
			to: nodePos + node.nodeSize
		};
	}
	const topLevelPos = resolved.before(1);
	return {
		from: topLevelPos,
		to: topLevelPos + resolved.node(1).nodeSize
	};
}
/**
* Converts an absolute document range to content-relative positions used by
* `Node#nodesBetween` and `Node#forEach` offsets.
*/
function toContentRelativeRange(doc, range) {
	return {
		from: Math.max(0, range.from - 1),
		to: Math.min(doc.content.size, range.to - 1)
	};
}
/**
* Returns the top-level block ranges that intersect a document change range.
* Input `from`/`to` are absolute positions (e.g. from `getChangedRanges`).
* Returned ranges are content-relative, matching `Node#forEach` offsets.
*/
function getTopLevelBlocksInRange(doc, from, to) {
	const ranges = [];
	doc.forEach((node, offset) => {
		const nodeStart = offset;
		const nodeEnd = nodeStart + node.nodeSize;
		const absNodeStart = nodeStart + 1;
		const absNodeEnd = nodeEnd + 1;
		if (absNodeStart < to && absNodeEnd > from) ranges.push({
			from: nodeStart,
			to: nodeEnd
		});
	});
	return ranges;
}
/**
* Sorts ranges by start position and merges overlapping or adjacent ranges.
*/
function mergeRanges(ranges) {
	if (ranges.length === 0) return [];
	const sorted = [...ranges].sort((a, b) => a.from - b.from);
	const merged = [{ ...sorted[0] }];
	for (let i = 1; i < sorted.length; i += 1) {
		const last = merged[merged.length - 1];
		const current = sorted[i];
		if (current.from <= last.to) last.to = Math.max(last.to, current.to);
		else merged.push({ ...current });
	}
	return merged;
}
//#endregion
//#region src/placeholder/utils/placeholderStateField.ts
/**
* Expands a single changed range to the top-level blocks it touches.
* Also resolves blocks at range boundaries so split/merge edits update
* adjacent empty nodes (e.g. a new paragraph after Enter).
*/
function collectBlocksForChange(doc, change) {
	const ranges = getTopLevelBlocksInRange(doc, change.from, change.to);
	ranges.push(toContentRelativeRange(doc, resolveTopLevelRange(doc, change.from)));
	if (change.to > change.from) ranges.push(toContentRelativeRange(doc, resolveTopLevelRange(doc, Math.min(change.to, doc.content.size + 1) - 1)));
	else if (change.from < doc.content.size + 1) ranges.push(toContentRelativeRange(doc, resolveTopLevelRange(doc, Math.min(change.from + 1, doc.content.size))));
	return ranges;
}
/**
* Collects content-relative top-level block ranges that need placeholder
* decorations recomputed after a transaction.
*/
function collectRescanRanges(tr, oldState, newState) {
	const ranges = [];
	if (tr.docChanged) {
		const changes = (0, _tiptap_core.getChangedRanges)(tr);
		for (const change of changes) ranges.push(...collectBlocksForChange(newState.doc, change.newRange));
	}
	if (tr.selectionSet) {
		ranges.push(toContentRelativeRange(newState.doc, resolveTopLevelRange(newState.doc, tr.mapping.map(oldState.selection.anchor))));
		ranges.push(toContentRelativeRange(newState.doc, resolveTopLevelRange(newState.doc, newState.selection.anchor)));
	}
	return mergeRanges(ranges);
}
/** Clamps a content-relative range to `[0, doc.content.size]`. */
function clampRange(from, to, doc) {
	const clampedFrom = Math.max(0, Math.min(from, doc.content.size));
	return {
		from: clampedFrom,
		to: Math.max(clampedFrom, Math.min(to, doc.content.size))
	};
}
/**
* Removes and rebuilds placeholder decorations within the given ranges.
* Only drops decorations fully contained in a range so mapped decorations
* on neighbouring blocks (e.g. at a block boundary) are kept intact.
*/
function updateDecorationsInRanges({ decorations, ranges, editor, options, dataAttribute, doc, selection }) {
	let next = decorations;
	for (const range of ranges) {
		const { from, to } = clampRange(range.from, range.to, doc);
		const existing = next.find(from, to).filter((decoration) => decoration.from >= from && decoration.to <= to);
		if (existing.length) next = next.remove(existing);
		const newDecos = scanRangeForDecorations({
			editor,
			options,
			dataAttribute,
			doc,
			selection,
			from,
			to
		});
		if (newDecos.length) next = next.add(doc, newDecos);
	}
	return next;
}
/**
* Creates the incremental `StateField<DecorationSet>` used by the slow path
* (`showOnlyCurrent: false` or `includeChildren: true`).
*
* Decorations are mapped through each transaction and only recomputed for
* top-level blocks touched by document or selection changes.
* @param options.editor - The editor instance.
* @param options.options - The resolved placeholder options.
* @param options.dataAttribute - The prepared `data-*` attribute name.
* @returns A ProseMirror state field storing the placeholder decoration set.
*/
function createPlaceholderStateField({ editor, options, dataAttribute }) {
	return {
		init(_config, state) {
			const decorations = buildPlaceholderDecorations({
				editor,
				options,
				dataAttribute,
				doc: state.doc,
				selection: state.selection
			});
			return decorations !== null && decorations !== void 0 ? decorations : _tiptap_pm_view.DecorationSet.empty;
		},
		apply(tr, prev, oldState, newState) {
			if (!tr.docChanged && !tr.selectionSet) return prev;
			return updateDecorationsInRanges({
				decorations: prev.map(tr.mapping, tr.doc),
				ranges: collectRescanRanges(tr, oldState, newState),
				editor,
				options,
				dataAttribute,
				doc: newState.doc,
				selection: newState.selection
			});
		}
	};
}
//#endregion
//#region src/placeholder/utils/preparePlaceholderAttribute.ts
/**
* Prepares the placeholder attribute by ensuring it is properly formatted.
* @param attr - The placeholder attribute string.
* @returns The prepared placeholder attribute string.
*/
function preparePlaceholderAttribute(attr) {
	return attr.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").replace(/^[0-9-]+/, "").replace(/^-+/, "").toLowerCase();
}
//#endregion
//#region src/placeholder/plugins/PlaceholderPlugin.ts
/**
* Creates the ProseMirror plugin that renders placeholder decorations.
* @param options.editor - The editor instance.
* @param options.options - The resolved placeholder options.
* @returns The configured placeholder plugin.
*/
function createPlaceholderPlugin({ editor, options }) {
	const dataAttribute = options.dataAttribute ? `data-${preparePlaceholderAttribute(options.dataAttribute)}` : `data-${DEFAULT_DATA_ATTRIBUTE}`;
	const useResolvedPath = options.showOnlyCurrent && !options.includeChildren;
	return new _tiptap_pm_state.Plugin({
		key: PLUGIN_KEY,
		...useResolvedPath ? {} : { state: createPlaceholderStateField({
			editor,
			options,
			dataAttribute
		}) },
		props: { decorations: useResolvedPath ? ({ doc, selection }) => buildPlaceholderDecorations({
			editor,
			options,
			dataAttribute,
			doc,
			selection
		}) : (state) => {
			var _PLUGIN_KEY$getState;
			if (options.showOnlyWhenEditable && !editor.isEditable) return _tiptap_pm_view.DecorationSet.empty;
			return (_PLUGIN_KEY$getState = PLUGIN_KEY.getState(state)) !== null && _PLUGIN_KEY$getState !== void 0 ? _PLUGIN_KEY$getState : _tiptap_pm_view.DecorationSet.empty;
		} }
	});
}
//#endregion
//#region src/placeholder/placeholder.ts
/**
* This extension allows you to add a placeholder to your editor.
* A placeholder is a text that appears when the editor or a node is empty.
* @see https://www.tiptap.dev/api/extensions/placeholder
*/
const Placeholder = _tiptap_core.Extension.create({
	name: "placeholder",
	addOptions() {
		return {
			emptyEditorClass: "is-editor-empty",
			emptyNodeClass: "is-empty",
			dataAttribute: DEFAULT_DATA_ATTRIBUTE,
			placeholder: "Write something …",
			showOnlyWhenEditable: true,
			showOnlyCurrent: true,
			includeChildren: false
		};
	},
	addProseMirrorPlugins() {
		return [createPlaceholderPlugin({
			editor: this.editor,
			options: this.options
		})];
	}
});
//#endregion
//#region src/selection/selection.ts
/**
* Whether the native browser selection should be cleared on blur and restored on focus.
* Only applies to non-empty text selections in an editable editor.
*/
function shouldSyncDomSelection(state, editor) {
	return !state.selection.empty && !(0, _tiptap_core.isNodeSelection)(state.selection) && editor.isEditable;
}
/**
* Whether the selection decoration should be rendered to keep the selection
* visible while the editor is blurred (and not dragging).
*/
function shouldPreserveSelection(state, editor) {
	return shouldSyncDomSelection(state, editor) && !editor.isFocused && !editor.view.dragging;
}
function clearDomSelection() {
	var _window$getSelection;
	(_window$getSelection = window.getSelection()) === null || _window$getSelection === void 0 || _window$getSelection.removeAllRanges();
}
/**
* Sync the native selection from the editor state.
* @see https://prosemirror.net/docs/ref/#view.EditorView.focus
*/
function restoreDomSelection(view) {
	view.focus();
}
/**
* This extension allows you to add a class to the selected text when the editor is blurred.
* It clears the native browser selection on blur (so `::selection` styles do not overlap the
* decoration) and restores it when the editor is focused again.
* @see https://www.tiptap.dev/api/extensions/selection
*/
const Selection = _tiptap_core.Extension.create({
	name: "selection",
	addOptions() {
		return { className: "selection" };
	},
	addProseMirrorPlugins() {
		const { editor, options } = this;
		return [new _tiptap_pm_state.Plugin({
			key: new _tiptap_pm_state.PluginKey("selection"),
			props: {
				decorations(state) {
					if (!shouldPreserveSelection(state, editor)) return null;
					return _tiptap_pm_view.DecorationSet.create(state.doc, [_tiptap_pm_view.Decoration.inline(state.selection.from, state.selection.to, { class: options.className })]);
				},
				handleDOMEvents: {
					blur(view) {
						if (!shouldSyncDomSelection(view.state, editor)) return false;
						clearDomSelection();
						return false;
					},
					focus(view) {
						if (!shouldSyncDomSelection(view.state, editor)) return false;
						requestAnimationFrame(() => {
							if (!editor.isDestroyed && view.hasFocus()) restoreDomSelection(view);
						});
						return false;
					}
				}
			}
		})];
	}
});
//#endregion
//#region src/trailing-node/trailing-node.ts
const skipTrailingNodeMeta = "skipTrailingNode";
function nodeEqualsType({ types, node }) {
	return node && Array.isArray(types) && types.includes(node.type) || (node === null || node === void 0 ? void 0 : node.type) === types;
}
/**
* This extension allows you to add an extra node at the end of the document.
* @see https://www.tiptap.dev/api/extensions/trailing-node
*/
const TrailingNode = _tiptap_core.Extension.create({
	name: "trailingNode",
	addOptions() {
		return {
			node: void 0,
			notAfter: []
		};
	},
	addProseMirrorPlugins() {
		var _this$editor$schema$t;
		const plugin = new _tiptap_pm_state.PluginKey(this.name);
		const defaultNode = this.options.node || ((_this$editor$schema$t = this.editor.schema.topNodeType.contentMatch.defaultType) === null || _this$editor$schema$t === void 0 ? void 0 : _this$editor$schema$t.name) || "paragraph";
		const disabledNodes = Object.entries(this.editor.schema.nodes).map(([, value]) => value).filter((node) => (this.options.notAfter || []).concat(defaultNode).includes(node.name));
		return [new _tiptap_pm_state.Plugin({
			key: plugin,
			appendTransaction: (transactions, __, state) => {
				const { doc, tr, schema } = state;
				const shouldInsertNodeAtEnd = plugin.getState(state);
				const endPosition = doc.content.size;
				const type = schema.nodes[defaultNode];
				if (transactions.some((transaction) => transaction.getMeta("skipTrailingNode"))) return;
				if (!shouldInsertNodeAtEnd) return;
				return tr.insert(endPosition, type.create());
			},
			state: {
				init: (_, state) => {
					const lastNode = state.tr.doc.lastChild;
					return !nodeEqualsType({
						node: lastNode,
						types: disabledNodes
					});
				},
				apply: (tr, value) => {
					if (!tr.docChanged) return value;
					if (tr.getMeta("__uniqueIDTransaction")) return value;
					const lastNode = tr.doc.lastChild;
					return !nodeEqualsType({
						node: lastNode,
						types: disabledNodes
					});
				}
			}
		})];
	}
});
//#endregion
//#region src/undo-redo/undo-redo.ts
/**
* This extension allows you to undo and redo recent changes.
* @see https://www.tiptap.dev/api/extensions/undo-redo
*
* **Important**: If the `@tiptap/extension-collaboration` package is used, make sure to remove
* the `undo-redo` extension, as it is not compatible with the `collaboration` extension.
*
* `@tiptap/extension-collaboration` uses its own history implementation.
*/
const UndoRedo = _tiptap_core.Extension.create({
	name: "undoRedo",
	addOptions() {
		return {
			depth: 100,
			newGroupDelay: 500
		};
	},
	addCommands() {
		return {
			undo: () => ({ state, dispatch }) => {
				return (0, _tiptap_pm_history.undo)(state, dispatch);
			},
			redo: () => ({ state, dispatch }) => {
				return (0, _tiptap_pm_history.redo)(state, dispatch);
			}
		};
	},
	addProseMirrorPlugins() {
		return [(0, _tiptap_pm_history.history)(this.options)];
	},
	addKeyboardShortcuts() {
		return {
			"Mod-z": () => this.editor.commands.undo(),
			"Shift-Mod-z": () => this.editor.commands.redo(),
			"Mod-y": () => this.editor.commands.redo(),
			"Mod-я": () => this.editor.commands.undo(),
			"Shift-Mod-я": () => this.editor.commands.redo()
		};
	}
});
//#endregion
exports.CharacterCount = CharacterCount;
exports.DEFAULT_DATA_ATTRIBUTE = DEFAULT_DATA_ATTRIBUTE;
exports.Dropcursor = Dropcursor;
exports.Focus = Focus;
exports.Gapcursor = Gapcursor;
exports.PLUGIN_KEY = PLUGIN_KEY;
exports.Placeholder = Placeholder;
exports.Selection = Selection;
exports.TrailingNode = TrailingNode;
exports.UndoRedo = UndoRedo;
exports.preparePlaceholderAttribute = preparePlaceholderAttribute;
exports.skipTrailingNodeMeta = skipTrailingNodeMeta;

//# sourceMappingURL=index.cjs.map