import type { VNode } from 'vue';
import type { AppConfig } from '@nuxt/schema';
import type { ComponentConfig } from '../../types/tv';
import theme from '#build/ui/prose/h4';
type ProseH4 = ComponentConfig<typeof theme, AppConfig, 'h4', 'ui.prose'>;
export interface ProseH4Props {
    id?: string;
    /**
     * Wrap the heading in an anchor link when an `id` is present.
     * `@nuxt/content` and `@nuxtjs/mdc` enable this for H2–H4 by default.
     * @defaultValue false
     */
    anchor?: boolean;
    class?: any;
    ui?: ProseH4['slots'];
}
export interface ProseH4Slots {
    default(props?: {}): VNode[];
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<ProseH4Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<ProseH4Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, ProseH4Slots>;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
