import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Extension, getChangedRanges, isNodeEmpty } from "@tiptap/core";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
//#region src/placeholder/constants.ts
/** The default data attribute label */
const DEFAULT_DATA_ATTRIBUTE = "placeholder";
/** The plugin key used to store and read the placeholder decoration set */
const PLUGIN_KEY = new PluginKey("tiptap__placeholder");
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
	return Decoration.node(pos, pos + node.nodeSize, {
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
		const isEmpty = !node.isLeaf && isNodeEmpty(node);
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
		if (node && node.type.isTextblock && isNodeEmpty(node)) {
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
	return DecorationSet.create(doc, decorations);
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
		const changes = getChangedRanges(tr);
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
			return decorations !== null && decorations !== void 0 ? decorations : DecorationSet.empty;
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
	return new Plugin({
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
			if (options.showOnlyWhenEditable && !editor.isEditable) return DecorationSet.empty;
			return (_PLUGIN_KEY$getState = PLUGIN_KEY.getState(state)) !== null && _PLUGIN_KEY$getState !== void 0 ? _PLUGIN_KEY$getState : DecorationSet.empty;
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
const Placeholder = Extension.create({
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
export { DEFAULT_DATA_ATTRIBUTE, PLUGIN_KEY, Placeholder, preparePlaceholderAttribute };

//# sourceMappingURL=index.js.map