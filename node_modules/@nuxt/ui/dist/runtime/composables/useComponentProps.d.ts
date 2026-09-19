import type { ComputedRef } from 'vue';
export type ThemeContext = {
    defaults: ComputedRef<Record<string, Record<string, any> | undefined>>;
};
declare const provideThemeContext: (contextValue: ThemeContext) => ThemeContext;
/**
 * Module-level fallback so components can call `useComponentProps` outside any
 * `<UTheme>` wrapper without crashing.
 */
export declare const defaultThemeContext: ThemeContext;
export declare function injectThemeContext(fallback?: ThemeContext): ThemeContext;
export { provideThemeContext };
/**
 * Resolve a component's props with the priority chain:
 *   explicit prop > nearest UTheme > app.config.ui.<name>.defaultVariants
 *     > withDefaults
 *
 * The returned proxy transparently reads from `props`, falling through to the
 * injected `ThemeContext` and `app.config.ui.<name>.defaultVariants` for
 * defaults. The component's tv() `defaultVariants` are intentionally left out
 * of the proxy fallback — they continue to drive `tv()`-internal class
 * resolution (the original semantics) without leaking into prop reads. The
 * `ui` and `class` props are merged (explicit classes override theme classes)
 * instead of being replaced.
 */
export declare function useComponentProps<T extends object>(name: string, props: T): T;
