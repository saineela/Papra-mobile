import { Mark } from "@tiptap/core";
//#region src/bold.d.ts
interface BoldOptions {
  /**
   * HTML attributes to add to the bold element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>;
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bold: {
      /**
       * Set a bold mark
       */
      setBold: () => ReturnType;
      /**
       * Toggle a bold mark
       */
      toggleBold: () => ReturnType;
      /**
       * Unset a bold mark
       */
      unsetBold: () => ReturnType;
    };
  }
}
/**
 * Matches bold text via `**` as input.
 */
declare const starInputRegex: RegExp;
/**
 * Matches bold text via `**` while pasting.
 */
declare const starPasteRegex: RegExp;
/**
 * Matches bold text via `__` as input.
 */
declare const underscoreInputRegex: RegExp;
/**
 * Matches bold text via `__` while pasting.
 */
declare const underscorePasteRegex: RegExp;
/**
 * This extension allows you to mark text as bold.
 * @see https://tiptap.dev/api/marks/bold
 */
declare const Bold: Mark<BoldOptions, any>;
//#endregion
export { Bold, Bold as default, BoldOptions, starInputRegex, starPasteRegex, underscoreInputRegex, underscorePasteRegex };
//# sourceMappingURL=index.d.ts.map