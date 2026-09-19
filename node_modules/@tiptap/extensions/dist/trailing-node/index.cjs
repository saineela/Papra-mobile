Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _tiptap_core = require("@tiptap/core");
let _tiptap_pm_state = require("@tiptap/pm/state");
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
exports.TrailingNode = TrailingNode;
exports.skipTrailingNodeMeta = skipTrailingNodeMeta;

//# sourceMappingURL=index.cjs.map