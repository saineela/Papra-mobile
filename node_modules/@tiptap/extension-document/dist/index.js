import { Node } from "@tiptap/core";
//#region src/document.ts
/**
* The default document node which represents the top level node of the editor.
* @see https://tiptap.dev/api/nodes/document
*/
const Document = Node.create({
	name: "doc",
	topNode: true,
	content: "block+",
	renderMarkdown: (node, h) => {
		if (!node.content) return "";
		return h.renderChildren(node.content, "\n\n");
	}
});
//#endregion
//#region src/index.ts
var src_default = Document;
//#endregion
export { Document, src_default as default };

//# sourceMappingURL=index.js.map