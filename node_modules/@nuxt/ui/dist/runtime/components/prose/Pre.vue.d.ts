import type { VNode } from 'vue';
import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/prose/pre';
import type { IconProps } from '../Icon.vue';
import type { ButtonProps } from '../Button.vue';
import type { LinkPropsKeys } from '../Link.vue';
import type { ComponentConfig } from '../../types/tv';
type ProsePre = ComponentConfig<typeof theme, AppConfig, 'pre', 'ui.prose'>;
export interface ProsePreProps {
    icon?: IconProps['name'];
    code?: string;
    language?: string;
    filename?: string;
    highlights?: number[];
    hideHeader?: boolean;
    meta?: string;
    /**
     * Display a button to copy the code to the clipboard.
     * `{ size: 'sm', color: 'neutral', variant: 'outline' }`{lang="ts-type"}
     * @defaultValue true
     */
    copy?: boolean | Omit<ButtonProps, LinkPropsKeys>;
    class?: any;
    ui?: ProsePre['slots'];
}
export interface ProsePreSlots {
    default(props?: {}): VNode[];
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<ProsePreProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<ProsePreProps> & Readonly<{}>, {
    copy: boolean | Omit<ButtonProps, LinkPropsKeys>;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, ProsePreSlots>;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
