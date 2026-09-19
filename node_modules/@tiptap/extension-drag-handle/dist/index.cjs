Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
let _floating_ui_dom = require("@floating-ui/dom");
let _tiptap_extension_collaboration = require("@tiptap/extension-collaboration");
let _tiptap_pm_state = require("@tiptap/pm/state");
let _tiptap_y_tiptap = require("@tiptap/y-tiptap");
let _tiptap_extension_node_range = require("@tiptap/extension-node-range");
//#region src/helpers/cloneElement.ts
function getCSSText(element, properties) {
	const style = getComputedStyle(element);
	if (properties) return properties.map((property) => property.trim()).filter((property) => property.length > 0).map((property) => `${property}:${style.getPropertyValue(property)};`).join("");
	let value = "";
	for (let i = 0; i < style.length; i += 1) value += `${style[i]}:${style.getPropertyValue(style[i])};`;
	return value;
}
function cloneElement(node, properties) {
	const clonedNode = node.cloneNode(true);
	const sourceElements = [node, ...Array.from(node.getElementsByTagName("*"))];
	const targetElements = [clonedNode, ...Array.from(clonedNode.getElementsByTagName("*"))];
	sourceElements.forEach((sourceElement, index) => {
		targetElements[index].style.cssText = getCSSText(sourceElement, properties);
	});
	return clonedNode;
}
/**
* All default rules.
* Users can extend these or replace them entirely.
*/
const defaultRules = [
	{
		id: "listItemFirstChild",
		evaluate: ({ parent, isFirst }) => {
			if (!isFirst) return 0;
			if (parent && ["listItem", "taskItem"].includes(parent.type.name)) return 1e3;
			return 0;
		}
	},
	{
		id: "listWrapperDeprioritize",
		evaluate: ({ node }) => {
			const listItemTypes = ["listItem", "taskItem"];
			const firstChild = node.firstChild;
			if (firstChild && listItemTypes.includes(firstChild.type.name)) return 1e3;
			return 0;
		}
	},
	{
		id: "tableStructure",
		evaluate: ({ node, parent }) => {
			if ([
				"tableRow",
				"tableCell",
				"tableHeader"
			].includes(node.type.name)) return 1e3;
			if (parent && parent.type.name === "tableHeader") return 1e3;
			return 0;
		}
	},
	{
		id: "inlineContent",
		evaluate: ({ node }) => {
			if (node.isInline || node.isText) return 1e3;
			return 0;
		}
	}
];
//#endregion
//#region src/helpers/edgeDetection.ts
/**
* Default edge detection configuration.
*/
const DEFAULT_EDGE_CONFIG = {
	edges: ["left", "top"],
	threshold: 12,
	strength: 500
};
/**
* Normalizes edge detection presets or custom config into a full config object.
* Partial configs are merged with defaults.
*
* @param input - The preset string or partial/full config
* @returns A complete EdgeDetectionConfig
*/
function normalizeEdgeDetection(input) {
	if (input === void 0 || input === "left") return { ...DEFAULT_EDGE_CONFIG };
	if (input === "right") return {
		edges: ["right", "top"],
		threshold: 12,
		strength: 500
	};
	if (input === "both") return {
		edges: [
			"left",
			"right",
			"top"
		],
		threshold: 12,
		strength: 500
	};
	if (input === "none") return {
		edges: [],
		threshold: 0,
		strength: 0
	};
	return {
		...DEFAULT_EDGE_CONFIG,
		...input
	};
}
/**
* Determines if cursor is near specified edges of an element.
*
* @param coords - The cursor coordinates
* @param element - The element to check against
* @param config - The edge detection configuration
* @returns True if the cursor is near any of the configured edges
*/
function isNearEdge(coords, element, config) {
	if (config.edges.length === 0) return false;
	const rect = element.getBoundingClientRect();
	const { threshold, edges } = config;
	return edges.some((edge) => {
		if (edge === "left") return coords.x - rect.left < threshold;
		if (edge === "right") return rect.right - coords.x < threshold;
		if (edge === "top") return coords.y - rect.top < threshold;
		if (edge === "bottom") return rect.bottom - coords.y < threshold;
		return false;
	});
}
/**
* Calculates score deduction for edge proximity.
* Deeper nodes get larger deductions when near edges,
* making shallower (parent) nodes win.
*
* @param coords - The cursor coordinates
* @param element - The element to check against (may be null)
* @param config - The edge detection configuration
* @param depth - The depth of the node in the document tree
* @returns The score deduction to apply
*/
function calculateEdgeDeduction(coords, element, config, depth) {
	if (!element || config.edges.length === 0) return 0;
	if (isNearEdge(coords, element, config)) return config.strength * depth;
	return 0;
}
//#endregion
//#region src/helpers/scoring.ts
/**
* Base score for all nodes. Rules deduct from this score.
* A node with score <= 0 is excluded from being a drag target.
*/
const BASE_SCORE = 1e3;
/**
* Calculates the drag target score for a node.
* Higher score = more likely to be selected.
*
* @param context - The rule context containing node information
* @param rules - The rules to apply
* @param edgeConfig - The edge detection configuration
* @param coords - The cursor coordinates
* @returns The calculated score, or -1 if the node is excluded
*/
function calculateScore(context, rules, edgeConfig, coords) {
	let score = BASE_SCORE;
	let excluded = false;
	rules.every((rule) => {
		const deduction = rule.evaluate(context);
		score -= deduction;
		if (score <= 0) {
			excluded = true;
			return false;
		}
		return true;
	});
	if (excluded) return -1;
	const dom = context.view.nodeDOM(context.pos);
	score -= calculateEdgeDeduction(coords, dom, edgeConfig, context.depth);
	if (score <= 0) return -1;
	return score;
}
//#endregion
//#region src/helpers/findBestDragTarget.ts
/**
* Checks if any ancestor at or above the given depth is in the allowed list.
*
* @param $pos - The resolved position
* @param depth - The current depth being checked
* @param allowedTypes - The list of allowed node type names
* @returns True if any ancestor is in the allowed list
*/
function hasAncestorOfType($pos, depth, allowedTypes) {
	return Array.from({ length: depth }, (_, i) => depth - 1 - i).some((d) => allowedTypes.includes($pos.node(d).type.name));
}
/**
* Finds the best drag target at the given coordinates using the scoring system.
*
* @param view - The editor view
* @param coords - The cursor coordinates
* @param options - The normalized nested options
* @returns The best drag target, or null if none found
*/
function findBestDragTarget(view, coords, options) {
	if (!Number.isFinite(coords.x) || !Number.isFinite(coords.y)) return null;
	const posInfo = view.posAtCoords({
		left: coords.x,
		top: coords.y
	});
	if (!posInfo) return null;
	const { doc } = view.state;
	const $pos = doc.resolve(posInfo.pos);
	const rules = [];
	if (options.defaultRules) rules.push(...defaultRules);
	rules.push(...options.rules);
	const candidates = Array.from({ length: $pos.depth }, (_, i) => $pos.depth - i).map((depth) => {
		const node = $pos.node(depth);
		const nodePos = $pos.before(depth);
		if (options.allowedContainers && depth > 0) {
			if (!hasAncestorOfType($pos, depth, options.allowedContainers)) return null;
		}
		const parent = depth > 0 ? $pos.node(depth - 1) : null;
		const index = depth > 0 ? $pos.index(depth - 1) : 0;
		const siblingCount = parent ? parent.childCount : 1;
		const score = calculateScore({
			node,
			pos: nodePos,
			depth,
			parent,
			index,
			isFirst: index === 0,
			isLast: index === siblingCount - 1,
			$pos,
			view
		}, rules, options.edgeDetection, coords);
		if (score < 0) return null;
		return {
			node,
			pos: nodePos,
			depth,
			score,
			dom: view.nodeDOM(nodePos)
		};
	}).filter((candidate) => candidate !== null);
	const nodeAfter = $pos.nodeAfter;
	if (nodeAfter && nodeAfter.isAtom && !nodeAfter.isInline) {
		const nodePos = posInfo.pos;
		const depth = $pos.depth + 1;
		const parent = $pos.parent;
		const index = $pos.index();
		const siblingCount = parent.childCount;
		let inAllowedContainer = true;
		if (options.allowedContainers) inAllowedContainer = hasAncestorOfType($pos, depth, options.allowedContainers);
		if (inAllowedContainer) {
			const score = calculateScore({
				node: nodeAfter,
				pos: nodePos,
				depth,
				parent,
				index,
				isFirst: index === 0,
				isLast: index === siblingCount - 1,
				$pos,
				view
			}, rules, options.edgeDetection, coords);
			if (score >= 0) {
				const dom = view.nodeDOM(nodePos);
				if (dom) candidates.push({
					node: nodeAfter,
					pos: nodePos,
					depth,
					score,
					dom
				});
			}
		}
	}
	if (candidates.length === 0) return null;
	candidates.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		return b.depth - a.depth;
	});
	const winner = candidates[0];
	if (!winner.dom) return null;
	return {
		node: winner.node,
		pos: winner.pos,
		dom: winner.dom
	};
}
//#endregion
//#region src/helpers/findNextElementFromCursor.ts
/**
* Finds the draggable block element that is a direct child of view.dom.
*
* Direct children that are widget decorations rather than document content are
* skipped — they are not draggable blocks, and treating them as such would
* align the drag handle to the decoration (e.g. the page header) instead of the
* actual first block on the page.
*/
function findClosestTopLevelBlock(element, view) {
	var _pmViewDesc;
	let current = element;
	while ((current === null || current === void 0 ? void 0 : current.parentElement) && current.parentElement !== view.dom) current = current.parentElement;
	if ((current === null || current === void 0 ? void 0 : current.parentElement) !== view.dom) return;
	if (!((_pmViewDesc = current.pmViewDesc) === null || _pmViewDesc === void 0 ? void 0 : _pmViewDesc.node)) return;
	return current;
}
/**
* Checks if a DOMRect has valid, finite dimensions.
*/
function isValidRect(rect) {
	return Number.isFinite(rect.top) && Number.isFinite(rect.bottom) && Number.isFinite(rect.left) && Number.isFinite(rect.right) && rect.width > 0 && rect.height > 0;
}
/**
* Returns the bounding rect of the first or last child of `container` that has
* a valid (non-zero) layout box.
*
* Some extensions insert zero-size widget decorations as the first/last child
* of the editor — for example the Pages extension anchors its page-chrome
* overlay in a zero-height `<div>` as the first child. Reading `firstElementChild`
* / `lastElementChild` directly would yield an invalid rect and abort clamping,
* so we skip over any edge children without a valid box.
*/
function edgeBlockRect(container, edge) {
	let current = edge === "first" ? container.firstElementChild : container.lastElementChild;
	while (current) {
		const rect = current.getBoundingClientRect();
		if (isValidRect(rect)) return rect;
		current = edge === "first" ? current.nextElementSibling : current.previousElementSibling;
	}
	return null;
}
/**
* Clamps coordinates to content bounds with O(1) layout reads
*/
function clampToContent(view, x, y, inset = 5) {
	if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
	const container = view.dom;
	const topRect = edgeBlockRect(container, "first");
	const botRect = edgeBlockRect(container, "last");
	if (!topRect || !botRect) return null;
	const clampedY = Math.min(Math.max(topRect.top + inset, y), botRect.bottom - inset);
	const epsilon = .5;
	const sameLeft = Math.abs(topRect.left - botRect.left) < epsilon;
	const sameRight = Math.abs(topRect.right - botRect.right) < epsilon;
	let rowRect = topRect;
	if (sameLeft && sameRight) rowRect = topRect;
	const clampedX = Math.min(Math.max(rowRect.left + inset, x), rowRect.right - inset);
	if (!Number.isFinite(clampedX) || !Number.isFinite(clampedY)) return null;
	return {
		x: clampedX,
		y: clampedY
	};
}
const findElementNextToCoords = (options) => {
	const { x, y, editor, nestedOptions } = options;
	const { view, state } = editor;
	const clamped = clampToContent(view, x, y, 5);
	if (!clamped) return {
		resultElement: null,
		resultNode: null,
		pos: null
	};
	const { x: clampedX, y: clampedY } = clamped;
	if (nestedOptions === null || nestedOptions === void 0 ? void 0 : nestedOptions.enabled) {
		const target = findBestDragTarget(view, {
			x: clampedX,
			y: clampedY
		}, nestedOptions);
		if (!target) return {
			resultElement: null,
			resultNode: null,
			pos: null
		};
		return {
			resultElement: target.dom,
			resultNode: target.node,
			pos: target.pos
		};
	}
	const elements = view.root.elementsFromPoint(clampedX, clampedY);
	let block;
	Array.prototype.some.call(elements, (el) => {
		if (!view.dom.contains(el)) return false;
		const candidate = findClosestTopLevelBlock(el, view);
		if (candidate) {
			block = candidate;
			return true;
		}
		return false;
	});
	if (!block) {
		const coords = view.posAtCoords({
			left: clampedX,
			top: clampedY
		});
		if (coords) {
			const $pos = state.doc.resolve(coords.pos);
			const depth = Math.min($pos.depth, 1);
			const blockPos = depth > 0 ? $pos.before(depth) : $pos.pos;
			const blockNode = state.doc.nodeAt(blockPos);
			if (blockNode) {
				const dom = view.nodeDOM(blockPos);
				return {
					resultElement: dom instanceof HTMLElement ? dom : null,
					resultNode: blockNode,
					pos: blockPos
				};
			}
		}
		return {
			resultElement: null,
			resultNode: null,
			pos: null
		};
	}
	let pos;
	try {
		pos = view.posAtDOM(block, 0);
	} catch {
		return {
			resultElement: null,
			resultNode: null,
			pos: null
		};
	}
	const node = state.doc.nodeAt(pos);
	if (!node) {
		const resolvedPos = state.doc.resolve(pos);
		const parent = resolvedPos.parent;
		return {
			resultElement: block,
			resultNode: parent,
			pos: resolvedPos.start()
		};
	}
	return {
		resultElement: block,
		resultNode: node,
		pos
	};
};
//#endregion
//#region src/helpers/getDraggedBlockDir.ts
/**
* Resolves the DOM element that visually represents the dragged block.
*/
function getDraggedBlockElement(view, pos) {
	const nodeDom = view.nodeDOM(pos);
	if (nodeDom instanceof Element && nodeDom !== view.dom) return nodeDom;
	const { node, offset } = view.domAtPos(pos);
	const child = node.childNodes[offset];
	if (child instanceof Element) return child;
	if (node instanceof Element) return node;
	if (node.nodeType === Node.TEXT_NODE && node.parentElement) return node.parentElement;
	return null;
}
/**
* Resolves the text direction (`dir` attribute value) for the block being
* dragged. Uses `view.nodeDOM` first because it maps a ProseMirror position
* directly to the block-level DOM element. Falls back to `view.domAtPos` with
* proper child-at-offset resolution when `nodeDOM` doesn't return an element,
* and ultimately to the editor root direction.
*/
function getDraggedBlockDir(view, pos) {
	const draggedDom = getDraggedBlockElement(view, pos);
	return (draggedDom ? getComputedStyle(draggedDom).direction : getComputedStyle(view.dom).direction) || "ltr";
}
//#endregion
//#region src/helpers/removeNode.ts
function removeNode(node) {
	var _node$parentNode;
	(_node$parentNode = node.parentNode) === null || _node$parentNode === void 0 || _node$parentNode.removeChild(node);
}
//#endregion
//#region src/helpers/dragHandler.ts
function getDragImageOffset(direction, wrapperWidth) {
	return direction === "rtl" ? wrapperWidth : 0;
}
function shouldResetMargin(dragImageProperties) {
	if (!dragImageProperties) return true;
	return !dragImageProperties.some((property) => {
		const p = property.trim().toLowerCase();
		return p === "margin" || p.startsWith("margin-");
	});
}
function getDragHandleRanges(event, editor, nestedOptions, dragContext) {
	const { doc } = editor.view.state;
	if ((nestedOptions === null || nestedOptions === void 0 ? void 0 : nestedOptions.enabled) && (dragContext === null || dragContext === void 0 ? void 0 : dragContext.node) && dragContext.pos >= 0) {
		const nodeStart = dragContext.pos;
		const nodeEnd = dragContext.pos + dragContext.node.nodeSize;
		return [{
			$from: doc.resolve(nodeStart),
			$to: doc.resolve(nodeEnd)
		}];
	}
	const result = findElementNextToCoords({
		editor,
		x: event.clientX,
		y: event.clientY,
		direction: "right",
		nestedOptions
	});
	if (!result.resultNode || result.pos === null) return [];
	const offset = result.resultNode.isText || result.resultNode.isAtom ? 0 : -1;
	const $from = doc.resolve(result.pos);
	const $to = doc.resolve(result.pos + result.resultNode.nodeSize + offset);
	return (0, _tiptap_extension_node_range.getSelectionRanges)($from, $to, 0, { extendOnBoundaryOverlap: false });
}
function dragHandler(event, editor, nestedOptions, dragContext, dragImageProperties) {
	const { view } = editor;
	if (!event.dataTransfer) return;
	const { empty, $from, $to } = view.state.selection;
	const dragHandleRanges = getDragHandleRanges(event, editor, nestedOptions, dragContext);
	const selectionRanges = (0, _tiptap_extension_node_range.getSelectionRanges)($from, $to, 0, { extendOnBoundaryOverlap: false });
	const isDragHandleWithinSelection = selectionRanges.some((range) => {
		return dragHandleRanges.find((dragHandleRange) => {
			return dragHandleRange.$from === range.$from && dragHandleRange.$to === range.$to;
		});
	});
	const ranges = empty || !isDragHandleWithinSelection ? dragHandleRanges : selectionRanges;
	if (!ranges.length) return;
	const { tr } = view.state;
	const wrapper = document.createElement("div");
	const from = ranges[0].$from.pos;
	const to = ranges[ranges.length - 1].$to.pos;
	const direction = getDraggedBlockDir(view, from);
	wrapper.setAttribute("dir", direction);
	const isNestedDrag = (nestedOptions === null || nestedOptions === void 0 ? void 0 : nestedOptions.enabled) && (dragContext === null || dragContext === void 0 ? void 0 : dragContext.node);
	const isSingleBlock = ranges.length === 1;
	let slice;
	let selection;
	if (isNestedDrag && isSingleBlock) {
		slice = view.state.doc.slice(from, to);
		selection = _tiptap_pm_state.NodeSelection.create(view.state.doc, from);
	} else {
		selection = _tiptap_extension_node_range.NodeRangeSelection.create(view.state.doc, from, to);
		slice = selection.content();
	}
	const resetMargin = shouldResetMargin(dragImageProperties);
	ranges.forEach((range) => {
		const element = getDraggedBlockElement(view, range.$from.pos);
		if (!element) return;
		const clonedElement = cloneElement(element, dragImageProperties);
		if (resetMargin) clonedElement.style.margin = "0";
		wrapper.append(clonedElement);
	});
	wrapper.style.position = "absolute";
	wrapper.style.top = "-10000px";
	document.body.append(wrapper);
	event.dataTransfer.clearData();
	const dragImageX = getDragImageOffset(direction, wrapper.getBoundingClientRect().width);
	event.dataTransfer.setDragImage(wrapper, dragImageX, 0);
	let cleanedUp = false;
	const cleanupDragPreview = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		removeNode(wrapper);
		document.removeEventListener("drop", cleanupDragPreview);
		document.removeEventListener("dragend", cleanupDragPreview);
	};
	const nodeSelection = selection instanceof _tiptap_pm_state.NodeSelection ? selection : void 0;
	view.dragging = {
		slice,
		move: true,
		node: nodeSelection
	};
	tr.setSelection(selection);
	view.dispatch(tr);
	document.addEventListener("drop", cleanupDragPreview);
	document.addEventListener("dragend", cleanupDragPreview);
}
//#endregion
//#region src/helpers/getOuterNode.ts
const getOuterNodePos = (doc, pos) => {
	const resolvedPos = doc.resolve(pos);
	const { depth } = resolvedPos;
	if (depth === 0) return pos;
	return resolvedPos.pos - resolvedPos.parentOffset - 1;
};
const getOuterNode = (doc, pos) => {
	const node = doc.nodeAt(pos);
	const resolvedPos = doc.resolve(pos);
	let { depth } = resolvedPos;
	let parent = node;
	while (depth > 0) {
		const currentNode = resolvedPos.node(depth);
		depth -= 1;
		if (depth === 0) parent = currentNode;
	}
	return parent;
};
//#endregion
//#region src/helpers/nodeRangeDrop.ts
function mapPendingRestoreAnchor(pendingRestore, tr, options) {
	if (!tr.docChanged) return pendingRestore;
	if (options.isChangeOrigin && pendingRestore.relativeAnchorPos != null) {
		const newPos = options.getAbsolutePos(pendingRestore.relativeAnchorPos);
		if (!Number.isFinite(newPos) || newPos <= 0) return null;
		return {
			...pendingRestore,
			anchorPos: newPos
		};
	}
	const mappedResult = tr.mapping.mapResult(pendingRestore.anchorPos, 1);
	if (mappedResult.deleted) return null;
	return {
		...pendingRestore,
		anchorPos: mappedResult.pos
	};
}
function sumNodeSizes(parent, from, to) {
	let size = 0;
	for (let i = from; i < to; i += 1) size += parent.child(i).nodeSize;
	return size;
}
function getActiveDragRange(selection) {
	var _selection$depth;
	if (!(0, _tiptap_extension_node_range.isNodeRangeSelection)(selection)) return null;
	return {
		anchorPos: selection.from,
		nodeCount: selection.ranges.length,
		depth: (_selection$depth = selection.depth) !== null && _selection$depth !== void 0 ? _selection$depth : 0
	};
}
/**
* Computes the position range of the freshly dropped blocks so a
* `NodeRangeSelection` can be restored over them after a drag-and-drop.
*/
function getDroppedBlockRange(doc, anchorPos, nodeCount, depth) {
	const $pos = doc.resolve(anchorPos);
	const parent = $pos.node(depth);
	let index = $pos.index(depth);
	if (index >= parent.childCount) index = Math.max(0, parent.childCount - nodeCount);
	const count = Math.min(nodeCount, parent.childCount - index);
	if (count <= 0) return null;
	const blockStart = $pos.start(depth) + sumNodeSizes(parent, 0, index);
	return {
		anchor: blockStart,
		head: blockStart + sumNodeSizes(parent, index, index + count),
		count
	};
}
function createDroppedNodeRangeSelection(doc, anchorPos, nodeCount, depth) {
	try {
		const range = getDroppedBlockRange(doc, anchorPos, nodeCount, depth);
		if (!range) return null;
		const selection = _tiptap_extension_node_range.NodeRangeSelection.create(doc, range.anchor, range.head, depth);
		return selection.ranges.length === nodeCount ? selection : null;
	} catch {
		return null;
	}
}
//#endregion
//#region src/drag-handle-plugin.ts
const getRelativePos = (state, absolutePos) => {
	const ystate = _tiptap_y_tiptap.ySyncPluginKey.getState(state);
	if (!ystate) return null;
	return (0, _tiptap_y_tiptap.absolutePositionToRelativePosition)(absolutePos, ystate.type, ystate.binding.mapping);
};
const getAbsolutePos = (state, relativePos) => {
	const ystate = _tiptap_y_tiptap.ySyncPluginKey.getState(state);
	if (!ystate) return -1;
	return (0, _tiptap_y_tiptap.relativePositionToAbsolutePosition)(ystate.doc, ystate.type, relativePos, ystate.binding.mapping) || 0;
};
const getOuterDomNode = (view, domNode) => {
	let tmpDomNode = domNode;
	while (tmpDomNode === null || tmpDomNode === void 0 ? void 0 : tmpDomNode.parentNode) {
		if (tmpDomNode.parentNode === view.dom) break;
		tmpDomNode = tmpDomNode.parentNode;
	}
	return tmpDomNode;
};
const dragHandlePluginDefaultKey = new _tiptap_pm_state.PluginKey("dragHandle");
const DragHandlePlugin = ({ pluginKey = dragHandlePluginDefaultKey, element, editor, computePositionConfig, getReferencedVirtualElement, onNodeChange, onElementDragStart, onElementDragEnd, nestedOptions, dragImageProperties }) => {
	const wrapper = document.createElement("div");
	let locked = false;
	let currentNode = null;
	let currentNodePos = -1;
	let currentNodeRelPos;
	let rafId = null;
	let pendingMouseCoords = null;
	let activeDragRange = null;
	let pendingRestore = null;
	function clearDragRangeState() {
		activeDragRange = null;
		pendingRestore = null;
	}
	function remapPendingRestore(tr, state) {
		if (!pendingRestore) return;
		pendingRestore = mapPendingRestoreAnchor(pendingRestore, tr, {
			isChangeOrigin: (0, _tiptap_extension_collaboration.isChangeOrigin)(tr),
			getAbsolutePos: (relativePos) => getAbsolutePos(state, relativePos)
		});
	}
	function buildRestoreTransaction(state) {
		if (!pendingRestore) return null;
		const nodeRangeSelection = createDroppedNodeRangeSelection(state.doc, pendingRestore.anchorPos, pendingRestore.nodeCount, pendingRestore.depth);
		if (!nodeRangeSelection) {
			pendingRestore = null;
			activeDragRange = null;
			return null;
		}
		clearDragRangeState();
		return state.tr.setSelection(nodeRangeSelection);
	}
	function hideHandle() {
		if (!element) return;
		element.style.visibility = "hidden";
		element.style.pointerEvents = "none";
	}
	function showHandle() {
		if (!element) return;
		if (!editor.isEditable) {
			hideHandle();
			return;
		}
		element.style.visibility = "";
		element.style.pointerEvents = "auto";
	}
	function repositionDragHandle(dom) {
		const virtualElement = (getReferencedVirtualElement === null || getReferencedVirtualElement === void 0 ? void 0 : getReferencedVirtualElement()) || { getBoundingClientRect: () => dom.getBoundingClientRect() };
		(0, _floating_ui_dom.computePosition)(virtualElement, element, computePositionConfig).then((val) => {
			Object.assign(element.style, {
				position: val.strategy,
				left: `${val.x}px`,
				top: `${val.y}px`
			});
		});
	}
	function onDragStart(e) {
		onElementDragStart === null || onElementDragStart === void 0 || onElementDragStart(e);
		dragHandler(e, editor, nestedOptions, {
			node: currentNode,
			pos: currentNodePos
		}, dragImageProperties);
		activeDragRange = getActiveDragRange(editor.state.selection);
		if (element) element.dataset.dragging = "true";
		setTimeout(() => {
			if (element) element.style.pointerEvents = "none";
		}, 0);
	}
	function onDragEnd(e) {
		onElementDragEnd === null || onElementDragEnd === void 0 || onElementDragEnd(e);
		activeDragRange = null;
		hideHandle();
		if (element) {
			element.style.pointerEvents = "auto";
			element.dataset.dragging = "false";
		}
	}
	function onDrop(e) {
		if (!e.target || !editor.view.dom.contains(e.target)) return;
		if ((0, _tiptap_core.isFirefox)()) {
			const editorElement = editor.view.dom;
			requestAnimationFrame(() => {
				if (editorElement.isContentEditable) {
					editorElement.contentEditable = "false";
					editorElement.contentEditable = "true";
				}
			});
		}
		if (!activeDragRange || editor.view.state.selection.empty) return;
		const anchorPos = editor.state.selection.from;
		const relativeAnchorPos = getRelativePos(editor.state, anchorPos);
		pendingRestore = {
			...activeDragRange,
			anchorPos,
			relativeAnchorPos: relativeAnchorPos !== null && relativeAnchorPos !== void 0 ? relativeAnchorPos : void 0
		};
		editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
	}
	function cleanup() {
		element.removeEventListener("dragstart", onDragStart);
		element.removeEventListener("dragend", onDragEnd);
		document.removeEventListener("drop", onDrop);
		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
			pendingMouseCoords = null;
		}
		clearDragRangeState();
	}
	wrapper.appendChild(element);
	return {
		unbind() {
			cleanup();
		},
		plugin: new _tiptap_pm_state.Plugin({
			key: typeof pluginKey === "string" ? new _tiptap_pm_state.PluginKey(pluginKey) : pluginKey,
			state: {
				init() {
					return { locked: false };
				},
				apply(tr, value, _oldState, state) {
					remapPendingRestore(tr, state);
					const isLocked = tr.getMeta("lockDragHandle");
					const hideDragHandle = tr.getMeta("hideDragHandle");
					if (isLocked !== void 0) locked = isLocked;
					if (hideDragHandle) {
						hideHandle();
						locked = false;
						currentNode = null;
						currentNodePos = -1;
						onNodeChange === null || onNodeChange === void 0 || onNodeChange({
							editor,
							node: null,
							pos: -1
						});
						return value;
					}
					if (tr.docChanged && currentNodePos !== -1 && element) {
						if ((0, _tiptap_extension_collaboration.isChangeOrigin)(tr)) {
							const newPos = getAbsolutePos(state, currentNodeRelPos);
							if (newPos !== currentNodePos) currentNodePos = newPos;
						} else {
							const newPos = tr.mapping.map(currentNodePos);
							if (newPos !== currentNodePos) {
								currentNodePos = newPos;
								currentNodeRelPos = getRelativePos(state, currentNodePos);
							}
						}
					}
					return value;
				}
			},
			appendTransaction(_transactions, _oldState, newState) {
				return buildRestoreTransaction(newState);
			},
			view: (view) => {
				var _editor$view$dom$pare;
				element.draggable = true;
				element.style.pointerEvents = "auto";
				element.dataset.dragging = "false";
				(_editor$view$dom$pare = editor.view.dom.parentElement) === null || _editor$view$dom$pare === void 0 || _editor$view$dom$pare.appendChild(wrapper);
				wrapper.style.pointerEvents = "none";
				wrapper.style.position = "absolute";
				wrapper.style.top = "0";
				wrapper.style.left = "0";
				wrapper.style.zIndex = "10";
				element.addEventListener("dragstart", onDragStart);
				element.addEventListener("dragend", onDragEnd);
				document.addEventListener("drop", onDrop);
				return {
					update(_, oldState) {
						if (!element) return;
						if (!editor.isEditable) {
							hideHandle();
							return;
						}
						if (locked) element.draggable = false;
						else element.draggable = true;
						if (view.state.doc.eq(oldState.doc) || currentNodePos === -1) return;
						let domNode = view.nodeDOM(currentNodePos);
						domNode = getOuterDomNode(view, domNode);
						if (domNode === view.dom) return;
						if ((domNode === null || domNode === void 0 ? void 0 : domNode.nodeType) !== 1) return;
						const domNodePos = view.posAtDOM(domNode, 0);
						const outerNode = getOuterNode(editor.state.doc, domNodePos);
						const outerNodePos = getOuterNodePos(editor.state.doc, domNodePos);
						currentNode = outerNode;
						currentNodePos = outerNodePos;
						currentNodeRelPos = getRelativePos(view.state, currentNodePos);
						onNodeChange === null || onNodeChange === void 0 || onNodeChange({
							editor,
							node: currentNode,
							pos: currentNodePos
						});
						repositionDragHandle(domNode);
					},
					destroy() {
						cleanup();
						if (element) removeNode(wrapper);
					}
				};
			},
			props: { handleDOMEvents: {
				keydown(view) {
					if (!element || locked) return false;
					if (view.hasFocus()) {
						hideHandle();
						currentNode = null;
						currentNodePos = -1;
						onNodeChange === null || onNodeChange === void 0 || onNodeChange({
							editor,
							node: null,
							pos: -1
						});
						return false;
					}
					return false;
				},
				mouseleave(_view, e) {
					if (locked) return false;
					if (e.target && !wrapper.contains(e.relatedTarget)) {
						hideHandle();
						currentNode = null;
						currentNodePos = -1;
						onNodeChange === null || onNodeChange === void 0 || onNodeChange({
							editor,
							node: null,
							pos: -1
						});
					}
					return false;
				},
				mousemove(view, e) {
					if (!element || locked) return false;
					pendingMouseCoords = {
						x: e.clientX,
						y: e.clientY
					};
					if (rafId) return false;
					rafId = requestAnimationFrame(() => {
						rafId = null;
						if (!pendingMouseCoords) return;
						const { x, y } = pendingMouseCoords;
						pendingMouseCoords = null;
						const nodeData = findElementNextToCoords({
							x,
							y,
							direction: "right",
							editor,
							nestedOptions
						});
						if (!nodeData.resultElement) return;
						let domNode = nodeData.resultElement;
						let targetNode = nodeData.resultNode;
						let targetPos = nodeData.pos;
						if (!(nestedOptions === null || nestedOptions === void 0 ? void 0 : nestedOptions.enabled)) {
							domNode = getOuterDomNode(view, domNode);
							if (domNode === view.dom) return;
							if ((domNode === null || domNode === void 0 ? void 0 : domNode.nodeType) !== 1) return;
							const domNodePos = view.posAtDOM(domNode, 0);
							targetNode = getOuterNode(editor.state.doc, domNodePos);
							targetPos = getOuterNodePos(editor.state.doc, domNodePos);
						}
						if (targetNode !== currentNode) {
							var _targetPos;
							currentNode = targetNode;
							currentNodePos = (_targetPos = targetPos) !== null && _targetPos !== void 0 ? _targetPos : -1;
							currentNodeRelPos = getRelativePos(view.state, currentNodePos);
							onNodeChange === null || onNodeChange === void 0 || onNodeChange({
								editor,
								node: currentNode,
								pos: currentNodePos
							});
							repositionDragHandle(domNode);
							showHandle();
						}
					});
					return false;
				}
			} }
		})
	};
};
//#endregion
//#region src/helpers/normalizeOptions.ts
/**
* Normalizes the nested options input into a complete configuration object.
*
* @param input - The nested option (boolean, object, or undefined)
* @returns A fully normalized options object
*
* @example
* // Simple enable
* normalizeNestedOptions(true)
* // Returns: { enabled: true, rules: [], defaultRules: true, ... }
*
* @example
* // Custom config
* normalizeNestedOptions({ rules: [myRule], edgeDetection: 'none' })
* // Returns: { enabled: true, rules: [myRule], edgeDetection: { edges: [], ... } }
*/
function normalizeNestedOptions(input) {
	var _input$rules, _input$defaultRules;
	if (input === false || input === void 0) return {
		enabled: false,
		rules: [],
		defaultRules: true,
		allowedContainers: void 0,
		edgeDetection: normalizeEdgeDetection("none")
	};
	if (input === true) return {
		enabled: true,
		rules: [],
		defaultRules: true,
		allowedContainers: void 0,
		edgeDetection: normalizeEdgeDetection("left")
	};
	return {
		enabled: true,
		rules: (_input$rules = input.rules) !== null && _input$rules !== void 0 ? _input$rules : [],
		defaultRules: (_input$defaultRules = input.defaultRules) !== null && _input$defaultRules !== void 0 ? _input$defaultRules : true,
		allowedContainers: input.allowedContainers,
		edgeDetection: normalizeEdgeDetection(input.edgeDetection)
	};
}
//#endregion
//#region src/drag-handle.ts
const defaultComputePositionConfig = {
	placement: "left-start",
	strategy: "absolute"
};
const DragHandle = _tiptap_core.Extension.create({
	name: "dragHandle",
	addOptions() {
		return {
			render() {
				const element = document.createElement("div");
				element.classList.add("drag-handle");
				return element;
			},
			computePositionConfig: {},
			locked: false,
			onNodeChange: () => {
				return null;
			},
			onElementDragStart: void 0,
			onElementDragEnd: void 0,
			nested: false,
			dragImageProperties: void 0
		};
	},
	addCommands() {
		return {
			lockDragHandle: () => ({ editor }) => {
				this.options.locked = true;
				return editor.commands.setMeta("lockDragHandle", this.options.locked);
			},
			unlockDragHandle: () => ({ editor }) => {
				this.options.locked = false;
				return editor.commands.setMeta("lockDragHandle", this.options.locked);
			},
			toggleDragHandle: () => ({ editor }) => {
				this.options.locked = !this.options.locked;
				return editor.commands.setMeta("lockDragHandle", this.options.locked);
			}
		};
	},
	addProseMirrorPlugins() {
		const element = this.options.render();
		const nestedOptions = normalizeNestedOptions(this.options.nested);
		return [DragHandlePlugin({
			computePositionConfig: {
				...defaultComputePositionConfig,
				...this.options.computePositionConfig
			},
			getReferencedVirtualElement: this.options.getReferencedVirtualElement,
			element,
			editor: this.editor,
			onNodeChange: this.options.onNodeChange,
			onElementDragStart: this.options.onElementDragStart,
			onElementDragEnd: this.options.onElementDragEnd,
			nestedOptions,
			dragImageProperties: this.options.dragImageProperties
		}).plugin];
	}
});
//#endregion
//#region src/index.ts
var src_default = DragHandle;
//#endregion
exports.DragHandle = DragHandle;
exports.DragHandlePlugin = DragHandlePlugin;
exports.default = src_default;
exports.defaultComputePositionConfig = defaultComputePositionConfig;
exports.defaultRules = defaultRules;
exports.dragHandlePluginDefaultKey = dragHandlePluginDefaultKey;
exports.normalizeNestedOptions = normalizeNestedOptions;

//# sourceMappingURL=index.cjs.map