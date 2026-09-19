import { Mark } from "@tiptap/core";
//#region src/strike.d.ts
interface StrikeOptions {
  /**
   * HTML attributes to add to the strike element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>;
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    strike: {
      /**
       * Set a strike mark
       * @example editor.commands.setStrike()
       */
      setStrike: () => ReturnType;
      /**
       * Toggle a strike mark
       * @example editor.commands.toggleStrike()
       */
      toggleStrike: () => ReturnType;
      /**
       * Unset a strike mark
       * @example editor.commands.unsetStrike()
       */
      unsetStrike: () => ReturnType;
    };
  }
}
/**
 * Matches a strike to a ~~strike~~ on input.
 */
declare const inputRegex: RegExp;
/**
 * Matches a strike to a ~~strike~~ on paste.
 */
declare const pasteRegex: RegExp;
/**
 * This extension allows you to create strike text.
 * @see https://www.tiptap.dev/api/marks/strike
 */
declare const Strike: Mark<StrikeOptions, any>;
//#endregion
export { Strike, Strike as default, StrikeOptions, inputRegex, pasteRegex };
//# sourceMappingURL=index.d.cts.map