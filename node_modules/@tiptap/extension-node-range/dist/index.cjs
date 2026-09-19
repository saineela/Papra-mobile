Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
let _tiptap_pm_state = require("@tiptap/pm/state");
let _tiptap_pm_view = require("@tiptap/pm/view");
let _tiptap_pm_model = require("@tiptap/pm/model");
//#region src/helpers/getNodeRangeDecorations.ts
function getNodeRangeDecorations(ranges) {
	if (!ranges.length) return _tiptap_pm_view.DecorationSet.empty;
	const decorations = [];
	const doc = ranges[0].$from.node(0);
	ranges.forEach((range) => {
		const pos = range.$from.pos;
		const node = range.$from.nodeAfter;
		if (!node) return;
		decorations.push(_tiptap_pm_view.Decoration.node(pos, pos + node.nodeSize, { class: "ProseMirror-selectednoderange" }));
	});
	return _tiptap_pm_view.DecorationSet.create(doc, decorations);
}
//#endregion
//#region src/helpers/getSelectionRanges.ts
function getNodeContentBounds(nodeStart, nodeSize, node) {
	const contentOffset = node.isText || node.isAtom ? 0 : 1;
	return {
		start: nodeStart + contentOffset,
		end: nodeStart + nodeSize - contentOffset
	};
}
/**
* Calculates node-aligned selection ranges between two resolved positions.
*
* The helper derives a suitable depth when none is provided and returns a
* `SelectionRange` for each matching child node in the computed `NodeRange`.
* Each returned range exposes `$from` as the resolved start position of the
* node selection and `$to` as the resolved end position.
*
* @param $from The resolved anchor position where the selection starts.
* @param $to The resolved head position where the selection ends.
* @param depth An optional depth to force when creating the ProseMirror `NodeRange`.
* When omitted, the depth is inferred from the shared depth of `$from` and `$to`.
* @param options Optional behavior flags for how boundary nodes are handled.
* @param options.extendOnBoundaryOverlap Whether touching only a node's start
* or end content boundary should still include that node in the returned ranges.
* @returns An array of `SelectionRange` objects for the nodes covered at the
* computed depth.
* @example
* ```ts
* const { $from, $to } = editor.state.selection
* const ranges = getSelectionRanges($from, $to, undefined, {
*   extendOnBoundaryOverlap: false,
* })
*
* ranges.forEach(range => {
*   console.log(range.$from.pos, range.$to.pos)
* })
* ```
*/
function getSelectionRanges($from, $to, depth, options = {}) {
	const ranges = [];
	const doc = $from.node(0);
	const { extendOnBoundaryOverlap = true } = options;
	if (typeof depth === "number" && depth >= 0) {} else if ($from.sameParent($to)) depth = Math.max(0, $from.sharedDepth($to.pos) - 1);
	else depth = $from.sharedDepth($to.pos);
	const nodeRange = new _tiptap_pm_model.NodeRange($from, $to, depth);
	const offset = nodeRange.depth === 0 ? 0 : doc.resolve(nodeRange.start).posAtIndex(0);
	nodeRange.parent.forEach((node, pos) => {
		const from = offset + pos;
		const to = from + node.nodeSize;
		const contentBounds = getNodeContentBounds(from, node.nodeSize, node);
		const overlapsNodeContent = extendOnBoundaryOverlap ? $to.pos >= contentBounds.start && $from.pos <= contentBounds.end : $to.pos > contentBounds.start && $from.pos < contentBounds.end;
		if (from < nodeRange.start || from >= nodeRange.end) return;
		if (!overlapsNodeContent) return;
		const selectionRange = new _tiptap_pm_state.SelectionRange(doc.resolve(from), doc.resolve(to));
		ranges.push(selectionRange);
	});
	return ranges;
}
//#endregion
//#region src/helpers/NodeRangeBookmark.ts
var NodeRangeBookmark = class NodeRangeBookmark {
	constructor(anchor, head, depth) {
		this.anchor = anchor;
		this.head = head;
		this.depth = depth !== null && depth !== void 0 ? depth : 0;
	}
	map(mapping) {
		return new NodeRangeBookmark(mapping.map(this.anchor), mapping.map(this.head), this.depth);
	}
	resolve(doc) {
		return new NodeRangeSelection(doc.resolve(this.anchor), doc.resolve(this.head), this.depth);
	}
};
//#endregion
//#region src/helpers/NodeRangeSelection.ts
var NodeRangeSelection = class NodeRangeSelection extends _tiptap_pm_state.Selection {
	constructor($anchor, $head, depth, bias = 1) {
		const { doc } = $anchor;
		const isCursor = $anchor === $head;
		const isCursorAtEnd = $anchor.pos === doc.content.size && $head.pos === doc.content.size;
		const $correctedHead = isCursor && !isCursorAtEnd ? doc.resolve($head.pos + (bias > 0 ? 1 : -1)) : $head;
		const $correctedAnchor = isCursor && isCursorAtEnd ? doc.resolve($anchor.pos - (bias > 0 ? 1 : -1)) : $anchor;
		const ranges = getSelectionRanges($correctedAnchor.min($correctedHead), $correctedAnchor.max($correctedHead), depth);
		const $rangeFrom = $correctedHead.pos >= $anchor.pos ? ranges[0].$from : ranges[ranges.length - 1].$to;
		const $rangeTo = $correctedHead.pos >= $anchor.pos ? ranges[ranges.length - 1].$to : ranges[0].$from;
		super($rangeFrom, $rangeTo, ranges);
		this.depth = depth;
	}
	get $to() {
		return this.ranges[this.ranges.length - 1].$to;
	}
	eq(other) {
		return other instanceof NodeRangeSelection && other.$from.pos === this.$from.pos && other.$to.pos === this.$to.pos;
	}
	map(doc, mapping) {
		const $anchor = doc.resolve(mapping.map(this.anchor));
		const $head = doc.resolve(mapping.map(this.head));
		return new NodeRangeSelection($anchor, $head, this.depth);
	}
	toJSON() {
		return {
			type: "nodeRange",
			anchor: this.anchor,
			head: this.head,
			depth: this.depth
		};
	}
	get isForwards() {
		return this.head >= this.anchor;
	}
	get isBackwards() {
		return !this.isForwards;
	}
	extendBackwards() {
		const { doc } = this.$from;
		if (this.isForwards && this.ranges.length > 1) {
			const ranges = this.ranges.slice(0, -1);
			const $from = ranges[0].$from;
			const $to = ranges[ranges.length - 1].$to;
			return new NodeRangeSelection($from, $to, this.depth);
		}
		const firstRange = this.ranges[0];
		const $from = doc.resolve(Math.max(0, firstRange.$from.pos - 1));
		return new NodeRangeSelection(this.$anchor, $from, this.depth);
	}
	extendForwards() {
		const { doc } = this.$from;
		if (this.isBackwards && this.ranges.length > 1) {
			const ranges = this.ranges.slice(1);
			const $from = ranges[0].$from;
			const $to = ranges[ranges.length - 1].$to;
			return new NodeRangeSelection($to, $from, this.depth);
		}
		const lastRange = this.ranges[this.ranges.length - 1];
		const $to = doc.resolve(Math.min(doc.content.size, lastRange.$to.pos + 1));
		return new NodeRangeSelection(this.$anchor, $to, this.depth);
	}
	static fromJSON(doc, json) {
		return new NodeRangeSelection(doc.resolve(json.anchor), doc.resolve(json.head), json.depth);
	}
	static create(doc, anchor, head, depth, bias = 1) {
		return new this(doc.resolve(anchor), doc.resolve(head), depth, bias);
	}
	getBookmark() {
		return new NodeRangeBookmark(this.anchor, this.head, this.depth);
	}
};
NodeRangeSelection.prototype.visible = false;
try {
	_tiptap_pm_state.Selection.jsonID("nodeRange", NodeRangeSelection);
} catch {}
//#endregion
//#region src/helpers/isNodeRangeSelection.ts
function isNodeRangeSelection(value) {
	return value instanceof NodeRangeSelection;
}
//#endregion
//#region src/node-range.ts
const NodeRange = _tiptap_core.Extension.create({
	name: "nodeRange",
	addOptions() {
		return {
			depth: void 0,
			key: "Mod"
		};
	},
	addKeyboardShortcuts() {
		return {
			"Shift-ArrowUp": ({ editor }) => {
				const { depth } = this.options;
				const { view, state } = editor;
				const { doc, selection, tr } = state;
				const { anchor, head } = selection;
				if (!isNodeRangeSelection(selection)) {
					const nodeRangeSelection = NodeRangeSelection.create(doc, anchor, head, depth, -1);
					tr.setSelection(nodeRangeSelection);
					view.dispatch(tr);
					return true;
				}
				const nodeRangeSelection = selection.extendBackwards();
				tr.setSelection(nodeRangeSelection);
				view.dispatch(tr);
				return true;
			},
			"Shift-ArrowDown": ({ editor }) => {
				const { depth } = this.options;
				const { view, state } = editor;
				const { doc, selection, tr } = state;
				const { anchor, head } = selection;
				if (!isNodeRangeSelection(selection)) {
					const nodeRangeSelection = NodeRangeSelection.create(doc, anchor, head, depth);
					tr.setSelection(nodeRangeSelection);
					view.dispatch(tr);
					return true;
				}
				const nodeRangeSelection = selection.extendForwards();
				tr.setSelection(nodeRangeSelection);
				view.dispatch(tr);
				return true;
			},
			"Mod-a": ({ editor }) => {
				const { depth } = this.options;
				const { view, state } = editor;
				const { doc, tr } = state;
				const nodeRangeSelection = NodeRangeSelection.create(doc, 0, doc.content.size, depth);
				tr.setSelection(nodeRangeSelection);
				view.dispatch(tr);
				return true;
			}
		};
	},
	onSelectionUpdate() {
		const { selection } = this.editor.state;
		if (isNodeRangeSelection(selection)) this.editor.view.dom.classList.add("ProseMirror-noderangeselection");
	},
	addProseMirrorPlugins() {
		let hideTextSelection = false;
		let activeMouseSelection = false;
		return [new _tiptap_pm_state.Plugin({
			key: new _tiptap_pm_state.PluginKey("nodeRange"),
			props: {
				attributes: () => {
					if (hideTextSelection) return { class: "ProseMirror-noderangeselection" };
					return { class: "" };
				},
				handleDOMEvents: { mousedown: (view, event) => {
					const { key } = this.options;
					const isMac = /Mac/.test(navigator.platform);
					const isShift = !!event.shiftKey;
					const isControl = !!event.ctrlKey;
					const isAlt = !!event.altKey;
					const isMeta = !!event.metaKey;
					if (key === null || key === void 0 || key === "Shift" && isShift || key === "Control" && isControl || key === "Alt" && isAlt || key === "Meta" && isMeta || key === "Mod" && (isMac ? isMeta : isControl)) activeMouseSelection = true;
					if (!activeMouseSelection) return false;
					document.addEventListener("mouseup", () => {
						activeMouseSelection = false;
						const { state } = view;
						const { doc, selection, tr } = state;
						const { $anchor, $head } = selection;
						if ($anchor.sameParent($head)) return;
						const nodeRangeSelection = NodeRangeSelection.create(doc, $anchor.pos, $head.pos, this.options.depth);
						tr.setSelection(nodeRangeSelection);
						view.dispatch(tr);
					}, { once: true });
					return false;
				} },
				decorations: (state) => {
					const { selection } = state;
					const isNodeRange = isNodeRangeSelection(selection);
					hideTextSelection = false;
					if (!activeMouseSelection) {
						if (!isNodeRange) return null;
						hideTextSelection = true;
						return getNodeRangeDecorations(selection.ranges);
					}
					const { $from, $to } = selection;
					if (!isNodeRange && $from.sameParent($to)) return null;
					const nodeRanges = getSelectionRanges($from, $to, this.options.depth);
					if (!nodeRanges.length) return null;
					hideTextSelection = true;
					return getNodeRangeDecorations(nodeRanges);
				}
			}
		})];
	}
});
//#endregion
//#region src/index.ts
var src_default = NodeRange;
//#endregion
exports.NodeRange = NodeRange;
exports.NodeRangeSelection = NodeRangeSelection;
exports.default = src_default;
exports.getNodeRangeDecorations = getNodeRangeDecorations;
exports.getSelectionRanges = getSelectionRanges;
exports.isNodeRangeSelection = isNodeRangeSelection;

//# sourceMappingURL=index.cjs.map