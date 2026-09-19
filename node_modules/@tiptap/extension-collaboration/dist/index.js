import { Extension, MappablePosition, getUpdatedPosition as getUpdatedPosition$1 } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { absolutePositionToRelativePosition, redo, relativePositionToAbsolutePosition, undo, ySyncPlugin, ySyncPluginKey, yUndoPlugin, yUndoPluginKey } from "@tiptap/y-tiptap";
//#region src/helpers/isChangeOrigin.ts
/**
* Checks if a transaction was originated from a Yjs change.
* @param {Transaction} transaction - The transaction to check.
* @returns {boolean} - True if the transaction was originated from a Yjs change, false otherwise.
* @example
* const transaction = new Transaction(doc)
* const isOrigin = isChangeOrigin(transaction) // returns false
*/
function isChangeOrigin(transaction) {
	return !!transaction.getMeta(ySyncPluginKey);
}
//#endregion
//#region src/helpers/yRelativePosition.ts
/**
* Converts a Y.js relative position to a position in the Tiptap document.
*/
function getYAbsolutePosition(state, relativePos) {
	const ystate = ySyncPluginKey.getState(state);
	return relativePositionToAbsolutePosition(ystate.doc, ystate.type, relativePos, ystate.binding.mapping) || 0;
}
/**
* Converts a position in the Tiptap document to a Y.js relative position.
*/
function getYRelativePosition(state, absolutePos) {
	const ystate = ySyncPluginKey.getState(state);
	return absolutePositionToRelativePosition(absolutePos, ystate.type, ystate.binding.mapping);
}
//#endregion
//#region src/helpers/CollaborationMappablePosition.ts
/**
* A MappablePosition subclass that includes Y.js relative position information
* to track positions in collaborative transactions.
*/
var CollaborationMappablePosition = class CollaborationMappablePosition extends MappablePosition {
	constructor(position, yRelativePosition) {
		super(position);
		this.yRelativePosition = yRelativePosition;
	}
	/**
	* Creates a CollaborationMappablePosition from a JSON object.
	*/
	static fromJSON(json) {
		return new CollaborationMappablePosition(json.position, json.yRelativePosition);
	}
	/**
	* Converts the CollaborationMappablePosition to a JSON object.
	*/
	toJSON() {
		return {
			position: this.position,
			yRelativePosition: this.yRelativePosition
		};
	}
};
/**
* Creates a MappablePosition from a position number.
* This is the collaboration implementation that returns a CollaborationMappablePosition.
*/
function createMappablePosition(position, state) {
	return new CollaborationMappablePosition(position, getYRelativePosition(state, position));
}
/**
* Returns the new position after applying a transaction. Handles both Y.js
* transactions and regular transactions.
*/
function getUpdatedPosition(position, transaction, state) {
	const yRelativePosition = position instanceof CollaborationMappablePosition ? position.yRelativePosition : null;
	if (isChangeOrigin(transaction) && yRelativePosition) return {
		position: new CollaborationMappablePosition(getYAbsolutePosition(state, yRelativePosition), yRelativePosition),
		mapResult: null
	};
	const result = getUpdatedPosition$1(position, transaction);
	const absolutePosition = result.position.position;
	return {
		position: new CollaborationMappablePosition(absolutePosition, yRelativePosition !== null && yRelativePosition !== void 0 ? yRelativePosition : getYRelativePosition(state, absolutePosition)),
		mapResult: result.mapResult
	};
}
//#endregion
//#region src/collaboration.ts
/**
* This extension allows you to collaborate with others in real-time.
* @see https://tiptap.dev/api/extensions/collaboration
*/
const Collaboration = Extension.create({
	name: "collaboration",
	priority: 1e3,
	addOptions() {
		return {
			document: null,
			field: "default",
			fragment: null,
			provider: null
		};
	},
	addStorage() {
		return { isDisabled: false };
	},
	onCreate() {
		if (this.editor.extensionManager.extensions.find((extension) => extension.name === "undoRedo")) console.warn("[tiptap warn]: \"@tiptap/extension-collaboration\" comes with its own history support and is not compatible with \"@tiptap/extension-undo-redo\".");
	},
	onBeforeCreate() {
		this.editor.utils.getUpdatedPosition = (position, transaction) => getUpdatedPosition(position, transaction, this.editor.state);
		this.editor.utils.createMappablePosition = (position) => createMappablePosition(position, this.editor.state);
	},
	addCommands() {
		return {
			undo: () => ({ tr, state, dispatch }) => {
				tr.setMeta("preventDispatch", true);
				if (yUndoPluginKey.getState(state).undoManager.undoStack.length === 0) return false;
				if (!dispatch) return true;
				return undo(state);
			},
			redo: () => ({ tr, state, dispatch }) => {
				tr.setMeta("preventDispatch", true);
				if (yUndoPluginKey.getState(state).undoManager.redoStack.length === 0) return false;
				if (!dispatch) return true;
				return redo(state);
			}
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-z": () => this.editor.commands.undo(),
			"Mod-y": () => this.editor.commands.redo(),
			"Shift-Mod-z": () => this.editor.commands.redo()
		};
	},
	addProseMirrorPlugins() {
		const fragment = this.options.fragment ? this.options.fragment : this.options.document.getXmlFragment(this.options.field);
		const yUndoPluginInstance = yUndoPlugin(this.options.yUndoOptions);
		const originalUndoPluginView = yUndoPluginInstance.spec.view;
		yUndoPluginInstance.spec.view = (view) => {
			const { undoManager } = yUndoPluginKey.getState(view.state);
			if (undoManager.restore) {
				undoManager.restore();
				undoManager.restore = () => {};
			}
			const viewRet = originalUndoPluginView ? originalUndoPluginView(view) : void 0;
			return { destroy: () => {
				const hasUndoManSelf = undoManager.trackedOrigins.has(undoManager);
				const observers = undoManager._observers;
				undoManager.restore = () => {
					if (hasUndoManSelf) undoManager.trackedOrigins.add(undoManager);
					undoManager.doc.on("afterTransaction", undoManager.afterTransactionHandler);
					undoManager._observers = observers;
				};
				if (viewRet === null || viewRet === void 0 ? void 0 : viewRet.destroy) viewRet.destroy();
			} };
		};
		const ySyncPluginOptions = {
			...this.options.ySyncOptions,
			onFirstRender: this.options.onFirstRender
		};
		return [
			ySyncPlugin(fragment, ySyncPluginOptions),
			yUndoPluginInstance,
			this.editor.options.enableContentCheck && new Plugin({
				key: new PluginKey("filterInvalidContent"),
				filterTransaction: (transaction) => {
					if (!isChangeOrigin(transaction)) return true;
					if (this.storage.isDisabled) return false;
					if (!transaction.docChanged) return true;
					try {
						transaction.doc.check();
						return true;
					} catch (error) {
						this.storage.isDisabled = true;
						this.editor.emit("contentError", {
							error,
							editor: this.editor,
							disableCollaboration: () => {
								var _fragment$doc;
								(_fragment$doc = fragment.doc) === null || _fragment$doc === void 0 || _fragment$doc.destroy();
							}
						});
						return true;
					}
				}
			})
		].filter(Boolean);
	}
});
//#endregion
//#region src/index.ts
var src_default = Collaboration;
//#endregion
export { Collaboration, CollaborationMappablePosition, createMappablePosition, src_default as default, getUpdatedPosition, isChangeOrigin };

//# sourceMappingURL=index.js.map