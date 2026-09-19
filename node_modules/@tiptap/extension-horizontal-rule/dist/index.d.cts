import { Node } from "@tiptap/core";
//#region src/horizontal-rule.d.ts
interface HorizontalRuleOptions {
  /**
   * The HTML attributes for a horizontal rule node.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>;
  /**
   * The default type to insert after the horizontal rule.
   * @default "paragraph"
   * @example "heading"
   */
  nextNodeType: string;
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    horizontalRule: {
      /**
       * Add a horizontal rule
       * @example editor.commands.setHorizontalRule()
       */
      setHorizontalRule: () => ReturnType;
    };
  }
}
/**
 * This extension allows you to insert horizontal rules.
 * @see https://www.tiptap.dev/api/nodes/horizontal-rule
 */
declare const HorizontalRule: Node<HorizontalRuleOptions, any>;
//#endregion
export { HorizontalRule, HorizontalRule as default, HorizontalRuleOptions };
//# sourceMappingURL=index.d.cts.map