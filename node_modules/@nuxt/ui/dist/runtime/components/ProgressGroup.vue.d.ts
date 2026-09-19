import type { VNode } from 'vue';
import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/progress-group';
import type { IconProps } from './Icon.vue';
import type { DynamicSlots } from '../types/utils';
import type { ComponentConfig } from '../types/tv';
type ProgressGroup = ComponentConfig<typeof theme, AppConfig, 'progressGroup'>;
export interface ProgressGroupItem {
    label?: string;
    /**
     * @IconifyIcon
     */
    icon?: IconProps['name'];
    /** The part of `max` this segment takes up. */
    value?: number;
    /**
     * Any theme color, or any CSS color value for palettes outside the theme.
     * @defaultValue 'primary'
     */
    color?: ProgressGroup['variants']['color'] | (string & {});
    slot?: string;
    class?: any;
    ui?: Pick<ProgressGroup['slots'], 'segment' | 'indicator' | 'item' | 'itemLeadingIcon' | 'itemLeadingDot' | 'itemLabel' | 'itemTrailing'>;
    [key: string]: any;
}
export interface ProgressGroupProps<T extends ProgressGroupItem = ProgressGroupItem> {
    /**
     * The element or component this component should render as.
     * @defaultValue 'div'
     */
    as?: any;
    items?: T[];
    /**
     * The value all items add up to, used to compute each segment's share of the track.
     * @defaultValue 100
     */
    max?: number;
    /** Display the summed progress value. */
    status?: boolean;
    /**
     * @defaultValue 'md'
     */
    size?: ProgressGroup['variants']['size'];
    /**
     * Any theme color, or any CSS color value for palettes outside the theme.
     * @defaultValue 'primary'
     */
    color?: ProgressGroup['variants']['color'] | (string & {});
    /**
     * The orientation of the progress bar.
     * @defaultValue 'horizontal'
     */
    orientation?: ProgressGroup['variants']['orientation'];
    class?: any;
    ui?: ProgressGroup['slots'];
}
type SlotProps<T extends ProgressGroupItem> = (props: {
    item: T;
    index: number;
    percent: number;
}) => VNode[];
export type ProgressGroupSlots<T extends ProgressGroupItem = ProgressGroupItem> = {
    'status'?: (props: {
        percent: number;
    }) => VNode[];
    'item'?: SlotProps<T>;
    'item-leading'?: SlotProps<T>;
    'item-label'?: SlotProps<T>;
    'item-trailing'?: SlotProps<T>;
} & DynamicSlots<T, 'leading' | 'label' | 'trailing', {
    index: number;
    percent: number;
}>;
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: <T extends ProgressGroupItem>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_exposed?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: import("vue").PublicProps & __VLS_PrettifyLocal<ProgressGroupProps<T>> & (typeof globalThis extends {
        __VLS_PROPS_FALLBACK: infer P;
    } ? P : {});
    expose: (exposed: {}) => void;
    attrs: any;
    slots: ProgressGroupSlots<T>;
    emit: {};
}>) => import("vue").VNode & {
    __ctx?: NonNullable<Awaited<typeof __VLS_setup>>;
};
type __VLS_PrettifyLocal<T> = (T extends any ? {
    [K in keyof T]: T[K];
} : {
    [K in keyof T as K]: T[K];
}) & {};
