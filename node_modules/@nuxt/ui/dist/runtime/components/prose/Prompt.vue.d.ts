import type { VNode } from 'vue';
import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/prose/prompt';
import type { IconProps } from '../Icon.vue';
import type { ComponentConfig } from '../../types/tv';
type ProsePrompt = ComponentConfig<typeof theme, AppConfig, 'prompt', 'ui.prose'>;
export interface ProsePromptProps {
    description?: string;
    /**
     * @IconifyIcon
     */
    icon?: IconProps['name'];
    /**
     * The `copy` action is always displayed, list any additional actions to show alongside it.
     * @defaultValue ['copy']
     */
    actions?: ('copy' | 'cursor' | 'windsurf' | 'claude')[];
    class?: any;
    ui?: ProsePrompt['slots'];
}
export interface ProsePromptSlots {
    default(props?: {}): VNode[];
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<ProsePromptProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<ProsePromptProps> & Readonly<{}>, {
    actions: ("copy" | "cursor" | "windsurf" | "claude")[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, ProsePromptSlots>;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
