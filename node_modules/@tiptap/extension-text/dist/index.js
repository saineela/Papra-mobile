import { Node } from "@tiptap/core";
//#region src/text.ts
/**
* This extension allows you to create text nodes.
* @see https://www.tiptap.dev/api/nodes/text
*/
const Text = Node.create({
	name: "text",
	group: "inline",
	parseMarkdown: (token) => {
		return {
			type: "text",
			text: token.text || ""
		};
	},
	renderMarkdown: (node) => node.text || ""
});
//#endregion
//#region src/index.ts
var src_default = Text;
//#endregion
export { Text, src_default as default };

//# sourceMappingURL=index.js.map