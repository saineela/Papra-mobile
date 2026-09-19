import { MotionProps } from '../motion';
import { ReorderAxis } from './types';
import { AsTag } from '../../types';
export interface GroupProps<T extends AsTag, K, V> extends MotionProps<T, K> {
    /**
     * The axis to reorder along. By default, the axis is auto-detected from
     * the measured item layouts. Set `"xy"` to enable reordering in
     * wrapped/grid layouts.
     *
     * @public
     */
    'axis'?: ReorderAxis;
    /**
     * A callback to fire with the new value order. Use `v-model`
     * to keep the values state in sync automatically.
     *
     * @public
     */
    'onUpdate:values'?: (newOrder: V[]) => void;
    /**
     * The latest values state.
     *
     * ```vue
     * <Reorder.Group v-model="items">
     *   <Reorder.Item v-for="item in items" :key="item" :value="item" />
     * </Reorder.Group>
     * ```
     *
     * @public
     */
    'values': V[];
}
declare const _default: <T, K, V>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: __VLS_PrettifyLocal<Pick<Partial<{}> & Omit<{} & import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps, never>, never> & GroupProps<AsTag, K, V> & Partial<{}>> & import('vue').PublicProps;
    expose(exposed: import('vue').ShallowUnwrapRef<{}>): void;
    attrs: any;
    slots: {
        default?(_: {}): any;
    };
    emit: {};
}>) => import('vue').VNode<import('vue').RendererNode, import('vue').RendererElement, {
    [key: string]: any;
}> & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
export default _default;
type __VLS_PrettifyLocal<T> = {
    [K in keyof T]: T[K];
} & {};
