import { Node } from "@tiptap/core";
//#region src/hard-break.d.ts
interface HardBreakOptions {
  /**
   * Controls if marks should be kept after being split by a hard break.
   * @default true
   * @example false
   */
  keepMarks: boolean;
  /**
   * HTML attributes to add to the hard break element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>;
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hardBreak: {
      /**
       * Add a hard break
       * @example editor.commands.setHardBreak()
       */
      setHardBreak: () => ReturnType;
    };
  }
}
/**
 * This extension allows you to insert hard breaks.
 * @see https://www.tiptap.dev/api/nodes/hard-break
 */
declare const HardBreak: Node<HardBreakOptions, any>;
//#endregion
export { HardBreak, HardBreak as default, HardBreakOptions };
//# sourceMappingURL=index.d.ts.map