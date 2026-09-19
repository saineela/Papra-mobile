import type { VNode } from 'vue';
import type { RatingRootProps, RatingRootEmits } from 'reka-ui';
import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/input-rating';
import type { IconProps } from './Icon.vue';
import type { ComponentConfig } from '../types/tv';
type InputRating = ComponentConfig<typeof theme, AppConfig, 'inputRating'>;
export interface InputRatingProps extends Pick<RatingRootProps, 'length' | 'step' | 'name' | 'disabled' | 'required' | 'clearable' | 'hoverable' | 'modelValue' | 'defaultValue'> {
    /**
     * The element or component this component should render as.
     * @defaultValue 'div'
     */
    as?: any;
    /** The id of the rating. */
    id?: string;
    /**
     * Make the rating readonly (non-interactive).
     * @defaultValue false
     */
    readonly?: boolean;
    /**
     * The icon displayed for each rating value.
     * @defaultValue appConfig.ui.icons.star
     * @IconifyIcon
     */
    icon?: IconProps['name'];
    /**
     * The icon displayed for empty rating values. Defaults to `icon` when not provided.
     * @IconifyIcon
     */
    emptyIcon?: IconProps['name'];
    /**
     * @defaultValue 'primary'
     */
    color?: InputRating['variants']['color'];
    /**
     * @defaultValue 'md'
     */
    size?: InputRating['variants']['size'];
    /**
     * The orientation of the rating.
     * @defaultValue 'horizontal'
     */
    orientation?: InputRating['variants']['orientation'];
    class?: any;
    ui?: InputRating['slots'];
}
export interface InputRatingEmits extends RatingRootEmits {
    change: [event: Event];
}
export interface InputRatingSlots {
    /** Rendered for each item. `filled` is `false` for the empty background layer and `true` for the highlighted overlay. */
    item?(props: {
        index: number;
        filled: boolean;
    }): VNode[];
}
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<InputRatingProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    change: (event: Event) => any;
    "update:modelValue": (payload: number) => any;
}, string, import("vue").PublicProps, Readonly<InputRatingProps> & Readonly<{
    onChange?: ((event: Event) => any) | undefined;
    "onUpdate:modelValue"?: ((payload: number) => any) | undefined;
}>, {
    length: number;
    orientation: InputRating["variants"]["orientation"];
    readonly: boolean;
    step: 1 | 0.5 | 0.25 | 0.1;
    defaultValue: number;
    clearable: boolean;
    hoverable: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, InputRatingSlots>;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
