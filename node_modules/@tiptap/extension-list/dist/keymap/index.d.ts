import { Editor, Extension } from "@tiptap/core";
import { Node, NodeType } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
//#region src/keymap/list-keymap.d.ts
type ListKeymapOptions = {
  /**
   * An array of list types. This is used for item and wrapper list matching.
   * @default []
   * @example [{ itemName: 'listItem', wrapperNames: ['bulletList', 'orderedList'] }]
   */
  listTypes: Array<{
    itemName: string;
    wrapperNames: string[];
  }>;
};
/**
 * This extension registers custom keymaps to change the behaviour of the backspace and delete keys.
 * By default Prosemirror keyhandling will always lift or sink items so paragraphs are joined into
 * the adjacent or previous list item. This extension will prevent this behaviour and instead will
 * try to join paragraphs from two list items into a single list item.
 * @see https://www.tiptap.dev/api/extensions/list-keymap
 */
declare const ListKeymap: Extension<ListKeymapOptions, any>;
//#endregion
//#region src/keymap/listHelpers/findListItemPos.d.ts
declare const findListItemPos: (typeOrName: string | NodeType, state: EditorState) => {
  $pos: import("prosemirror-model").ResolvedPos;
  depth: number;
} | null;
//#endregion
//#region src/keymap/listHelpers/getNextListDepth.d.ts
declare const getNextListDepth: (typeOrName: string, state: EditorState) => number | false;
//#endregion
//#region src/keymap/listHelpers/handleBackspace.d.ts
declare const handleBackspace: (editor: Editor, name: string, parentListTypes: string[]) => boolean;
//#endregion
//#region src/keymap/listHelpers/handleDelete.d.ts
declare const handleDelete: (editor: Editor, name: string) => boolean;
//#endregion
//#region src/keymap/listHelpers/handleTab.d.ts
declare const handleTab: (editor: Editor, name: string, parentListTypes: string[]) => boolean;
//#endregion
//#region src/keymap/listHelpers/hasListBefore.d.ts
declare const hasListBefore: (editorState: EditorState, name: string, parentListTypes: string[]) => boolean;
//#endregion
//#region src/keymap/listHelpers/hasListItemAfter.d.ts
declare const hasListItemAfter: (typeOrName: string, state: EditorState) => boolean;
//#endregion
//#region src/keymap/listHelpers/hasListItemBefore.d.ts
declare const hasListItemBefore: (typeOrName: string, state: EditorState) => boolean;
//#endregion
//#region src/keymap/listHelpers/listItemHasSubList.d.ts
declare const listItemHasSubList: (typeOrName: string, state: EditorState, node?: Node) => boolean;
//#endregion
//#region src/keymap/listHelpers/nextListIsDeeper.d.ts
declare const nextListIsDeeper: (typeOrName: string, state: EditorState) => boolean;
//#endregion
//#region src/keymap/listHelpers/nextListIsHigher.d.ts
declare const nextListIsHigher: (typeOrName: string, state: EditorState) => boolean;
declare namespace index_d_exports {
  export { findListItemPos, getNextListDepth, handleBackspace, handleDelete, handleTab, hasListBefore, hasListItemAfter, hasListItemBefore, listItemHasSubList, nextListIsDeeper, nextListIsHigher };
}
//#endregion
export { ListKeymap, ListKeymapOptions, index_d_exports as listHelpers };
//# sourceMappingURL=index.d.ts.map