import type { SplitterGroupProps, SplitterGroupEmits, SplitterPanelProps, SplitterResizeHandleProps } from 'reka-ui';
import type { VNode, ComponentPublicInstance } from 'vue';
import type { AppConfig } from '@nuxt/schema';
import theme from '#build/ui/splitter';
import type { DynamicSlots } from '../types/utils';
import type { ComponentConfig } from '../types/tv';
type Splitter = ComponentConfig<typeof theme, AppConfig, 'splitter'>;
export interface SplitterItem extends Omit<SplitterPanelProps, 'as' | 'asChild'> {
    /**
     * A unique id for the panel. Also used as the Vue `key`. Defaults to an auto-generated id.
     */
    id?: string;
    slot?: string;
    class?: any;
    ui?: Pick<Splitter['slots'], 'panel'>;
    [key: string]: any;
}
export interface SplitterProps<T extends SplitterItem = SplitterItem> extends Pick<SplitterGroupProps, 'autoSaveId' | 'keyboardResizeBy' | 'storage'>, Pick<SplitterResizeHandleProps, 'hitAreaMargins'> {
    /**
     * The element or component this component should render as.
     * @defaultValue 'div'
     */
    as?: any;
    /**
     * A unique id for the group, also used to derive the ids of its panels and handles.
     * Set it when rendering on the server, auto-generated ids can differ between the server and the client and break resizing on hydration.
     */
    id?: string;
    /**
     * The orientation of the splitter.
     * @defaultValue 'horizontal'
     */
    orientation?: Splitter['variants']['orientation'];
    items?: T[];
    /**
     * Whether the resize handles are disabled, locking the current layout.
     * @defaultValue false
     */
    disabled?: boolean;
    class?: any;
    ui?: Splitter['slots'];
}
export interface SplitterEmits {
    layout: SplitterGroupEmits['layout'];
    collapse: [index: number];
    expand: [index: number];
    resize: [index: number, size: number, prevSize?: number];
    dragging: [index: number, dragging: boolean];
}
type PanelSlotProps = {
    index: number;
    collapsed: boolean;
    collapse: () => void;
    expand: () => void;
    resize: (size: number) => void;
    ui: Splitter['ui'];
};
type SlotProps<T extends SplitterItem> = (props: {
    item: T;
} & PanelSlotProps) => VNode[];
export type SplitterSlots<T extends SplitterItem = SplitterItem> = {
    'resize-handle'?: (props: {
        index: number;
        ui: Splitter['ui'];
    }) => VNode[];
} & DynamicSlots<T, undefined, PanelSlotProps> & {
    [key: `panel-${number}`]: SlotProps<T> | undefined;
};
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: <T extends SplitterItem>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_exposed?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: import("vue").PublicProps & __VLS_PrettifyLocal<SplitterProps<T> & {
        onResize?: ((index: number, size: number, prevSize?: number | undefined) => any) | undefined;
        onCollapse?: ((index: number) => any) | undefined;
        onExpand?: ((index: number) => any) | undefined;
        onLayout?: ((val: number[]) => any) | undefined;
        onDragging?: ((index: number, dragging: boolean) => any) | undefined;
    }> & (typeof globalThis extends {
        __VLS_PROPS_FALLBACK: infer P;
    } ? P : {});
    expose: (exposed: import("vue").ShallowUnwrapRef<{
        panelsRef: import("vue").Ref<({
            $: import("vue").ComponentInternalInstance;
            $data: {};
            $props: {
                readonly collapsedSize?: number | undefined;
                readonly collapsible?: boolean | undefined;
                readonly defaultSize?: number | undefined;
                readonly id?: string | undefined;
                readonly maxSize?: number | undefined;
                readonly minSize?: number | undefined;
                readonly order?: number | undefined;
                readonly sizeUnit?: "%" | "px" | undefined;
                readonly asChild?: boolean | undefined;
                readonly as?: (import("reka-ui").AsTag | import("vue").Component) | undefined;
                readonly onResize?: ((size: number, prevSize: number | undefined) => any) | undefined | undefined;
                readonly onCollapse?: (() => any) | undefined | undefined;
                readonly onExpand?: (() => any) | undefined | undefined;
            } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps;
            $attrs: import("vue").Attrs;
            $refs: {
                [x: string]: unknown;
            };
            $slots: Readonly<{
                [name: string]: import("vue").Slot<any> | undefined;
            }>;
            $root: ComponentPublicInstance | null;
            $parent: ComponentPublicInstance | null;
            $host: Element | null;
            $emit: ((event: "resize", size: number, prevSize: number | undefined) => void) & ((event: "collapse") => void) & ((event: "expand") => void);
            $el: any;
            $options: import("vue").ComponentOptionsBase<Readonly<SplitterPanelProps> & Readonly<{
                onResize?: ((size: number, prevSize: number | undefined) => any) | undefined;
                onCollapse?: (() => any) | undefined;
                onExpand?: (() => any) | undefined;
            }>, {
                collapse: () => void;
                expand: () => void;
                getSize(): number;
                resize: (size: number) => void;
                isCollapsed: import("vue").ComputedRef<boolean>;
                isExpanded: import("vue").ComputedRef<boolean>;
            }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                resize: (size: number, prevSize: number | undefined) => any;
                collapse: () => any;
                expand: () => any;
            }, string, {}, {}, string, {}, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, import("vue").ComponentProvideOptions> & {
                beforeCreate?: (() => void) | (() => void)[];
                created?: (() => void) | (() => void)[];
                beforeMount?: (() => void) | (() => void)[];
                mounted?: (() => void) | (() => void)[];
                beforeUpdate?: (() => void) | (() => void)[];
                updated?: (() => void) | (() => void)[];
                activated?: (() => void) | (() => void)[];
                deactivated?: (() => void) | (() => void)[];
                beforeDestroy?: (() => void) | (() => void)[];
                beforeUnmount?: (() => void) | (() => void)[];
                destroyed?: (() => void) | (() => void)[];
                unmounted?: (() => void) | (() => void)[];
                renderTracked?: ((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[];
                renderTriggered?: ((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[];
                errorCaptured?: ((err: unknown, instance: ComponentPublicInstance | null, info: string) => boolean | void) | ((err: unknown, instance: ComponentPublicInstance | null, info: string) => boolean | void)[];
            };
            $forceUpdate: () => void;
            $nextTick: typeof import("vue").nextTick;
            $watch<T_1 extends string | ((...args: any) => any)>(source: T_1, cb: T_1 extends (...args: any) => infer R ? (...args: [R, R, import("@vue/reactivity").OnCleanup]) => any : (...args: [any, any, import("@vue/reactivity").OnCleanup]) => any, options?: import("vue").WatchOptions): import("vue").WatchStopHandle;
        } & Readonly<{}> & Omit<Readonly<SplitterPanelProps> & Readonly<{
            onResize?: ((size: number, prevSize: number | undefined) => any) | undefined;
            onCollapse?: (() => any) | undefined;
            onExpand?: (() => any) | undefined;
        }>, "resize" | "collapse" | "expand" | "isCollapsed" | "getSize" | "isExpanded"> & {
            collapse: () => void;
            expand: () => void;
            getSize: () => number;
            resize: (size: number) => void;
            isCollapsed: boolean;
            isExpanded: boolean;
        } & {} & import("vue").ComponentCustomProperties & {} & {
            $slots: {
                default?: (props: {
                    isCollapsed: boolean;
                    isExpanded: boolean;
                    collapse: () => void;
                    expand: () => void;
                    resize: (size: number) => void;
                }) => any;
            };
        })[], ({
            $: import("vue").ComponentInternalInstance;
            $data: {};
            $props: {
                readonly collapsedSize?: number | undefined;
                readonly collapsible?: boolean | undefined;
                readonly defaultSize?: number | undefined;
                readonly id?: string | undefined;
                readonly maxSize?: number | undefined;
                readonly minSize?: number | undefined;
                readonly order?: number | undefined;
                readonly sizeUnit?: "%" | "px" | undefined;
                readonly asChild?: boolean | undefined;
                readonly as?: (import("reka-ui").AsTag | import("vue").Component) | undefined;
                readonly onResize?: ((size: number, prevSize: number | undefined) => any) | undefined | undefined;
                readonly onCollapse?: (() => any) | undefined | undefined;
                readonly onExpand?: (() => any) | undefined | undefined;
            } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps;
            $attrs: import("vue").Attrs;
            $refs: {
                [x: string]: unknown;
            };
            $slots: Readonly<{
                [name: string]: import("vue").Slot<any> | undefined;
            }>;
            $root: ComponentPublicInstance | null;
            $parent: ComponentPublicInstance | null;
            $host: Element | null;
            $emit: ((event: "resize", size: number, prevSize: number | undefined) => void) & ((event: "collapse") => void) & ((event: "expand") => void);
            $el: any;
            $options: import("vue").ComponentOptionsBase<Readonly<SplitterPanelProps> & Readonly<{
                onResize?: ((size: number, prevSize: number | undefined) => any) | undefined;
                onCollapse?: (() => any) | undefined;
                onExpand?: (() => any) | undefined;
            }>, {
                collapse: () => void;
                expand: () => void;
                getSize(): number;
                resize: (size: number) => void;
                isCollapsed: import("vue").ComputedRef<boolean>;
                isExpanded: import("vue").ComputedRef<boolean>;
            }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                resize: (size: number, prevSize: number | undefined) => any;
                collapse: () => any;
                expand: () => any;
            }, string, {}, {}, string, {}, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, import("vue").ComponentProvideOptions> & {
                beforeCreate?: (() => void) | (() => void)[];
                created?: (() => void) | (() => void)[];
                beforeMount?: (() => void) | (() => void)[];
                mounted?: (() => void) | (() => void)[];
                beforeUpdate?: (() => void) | (() => void)[];
                updated?: (() => void) | (() => void)[];
                activated?: (() => void) | (() => void)[];
                deactivated?: (() => void) | (() => void)[];
                beforeDestroy?: (() => void) | (() => void)[];
                beforeUnmount?: (() => void) | (() => void)[];
                destroyed?: (() => void) | (() => void)[];
                unmounted?: (() => void) | (() => void)[];
                renderTracked?: ((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[];
                renderTriggered?: ((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[];
                errorCaptured?: ((err: unknown, instance: ComponentPublicInstance | null, info: string) => boolean | void) | ((err: unknown, instance: ComponentPublicInstance | null, info: string) => boolean | void)[];
            };
            $forceUpdate: () => void;
            $nextTick: typeof import("vue").nextTick;
            $watch<T_1 extends string | ((...args: any) => any)>(source: T_1, cb: T_1 extends (...args: any) => infer R ? (...args: [R, R, import("@vue/reactivity").OnCleanup]) => any : (...args: [any, any, import("@vue/reactivity").OnCleanup]) => any, options?: import("vue").WatchOptions): import("vue").WatchStopHandle;
        } & Readonly<{}> & Omit<Readonly<SplitterPanelProps> & Readonly<{
            onResize?: ((size: number, prevSize: number | undefined) => any) | undefined;
            onCollapse?: (() => any) | undefined;
            onExpand?: (() => any) | undefined;
        }>, "resize" | "collapse" | "expand" | "isCollapsed" | "getSize" | "isExpanded"> & {
            collapse: () => void;
            expand: () => void;
            getSize: () => number;
            resize: (size: number) => void;
            isCollapsed: boolean;
            isExpanded: boolean;
        } & {} & import("vue").ComponentCustomProperties & {} & {
            $slots: {
                default?: (props: {
                    isCollapsed: boolean;
                    isExpanded: boolean;
                    collapse: () => void;
                    expand: () => void;
                    resize: (size: number) => void;
                }) => any;
            };
        })[]>;
    }>) => void;
    attrs: any;
    slots: SplitterSlots<T>;
    emit: ((evt: "resize", index: number, size: number, prevSize?: number | undefined) => void) & ((evt: "collapse", index: number) => void) & ((evt: "expand", index: number) => void) & ((evt: "layout", val: number[]) => void) & ((evt: "dragging", index: number, dragging: boolean) => void);
}>) => import("vue").VNode & {
    __ctx?: NonNullable<Awaited<typeof __VLS_setup>>;
};
type __VLS_PrettifyLocal<T> = (T extends any ? {
    [K in keyof T]: T[K];
} : {
    [K in keyof T as K]: T[K];
}) & {};
