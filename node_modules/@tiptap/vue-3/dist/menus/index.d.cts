import { BubbleMenuPluginProps } from "@tiptap/extension-bubble-menu";
import { PluginKey } from "@tiptap/pm/state";
import { PropType } from "vue";
import { FloatingMenuPluginProps } from "@tiptap/extension-floating-menu";
//#region src/menus/BubbleMenu.d.ts
declare const BubbleMenu: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  pluginKey: {
    type: PropType<BubbleMenuPluginProps["pluginKey"]>;
    default: undefined;
  };
  editor: {
    type: PropType<BubbleMenuPluginProps["editor"]>;
    required: true;
  };
  updateDelay: {
    type: PropType<BubbleMenuPluginProps["updateDelay"]>;
    default: undefined;
  };
  resizeDelay: {
    type: PropType<BubbleMenuPluginProps["resizeDelay"]>;
    default: undefined;
  };
  options: {
    type: PropType<BubbleMenuPluginProps["options"]>;
    default: () => {};
  };
  appendTo: {
    type: PropType<BubbleMenuPluginProps["appendTo"]>;
    default: undefined;
  };
  shouldShow: {
    type: PropType<Exclude<Required<BubbleMenuPluginProps>["shouldShow"], null>>;
    default: null;
  };
  getReferencedVirtualElement: {
    type: PropType<Exclude<Required<BubbleMenuPluginProps>["getReferencedVirtualElement"], null>>;
    default: undefined;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  pluginKey: {
    type: PropType<BubbleMenuPluginProps["pluginKey"]>;
    default: undefined;
  };
  editor: {
    type: PropType<BubbleMenuPluginProps["editor"]>;
    required: true;
  };
  updateDelay: {
    type: PropType<BubbleMenuPluginProps["updateDelay"]>;
    default: undefined;
  };
  resizeDelay: {
    type: PropType<BubbleMenuPluginProps["resizeDelay"]>;
    default: undefined;
  };
  options: {
    type: PropType<BubbleMenuPluginProps["options"]>;
    default: () => {};
  };
  appendTo: {
    type: PropType<BubbleMenuPluginProps["appendTo"]>;
    default: undefined;
  };
  shouldShow: {
    type: PropType<Exclude<Required<BubbleMenuPluginProps>["shouldShow"], null>>;
    default: null;
  };
  getReferencedVirtualElement: {
    type: PropType<Exclude<Required<BubbleMenuPluginProps>["getReferencedVirtualElement"], null>>;
    default: undefined;
  };
}>> & Readonly<{}>, {
  updateDelay: number | undefined;
  resizeDelay: number | undefined;
  options: {
    strategy?: "absolute" | "fixed";
    placement?: "top" | "right" | "bottom" | "left" | "top-start" | "top-end" | "right-start" | "right-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end";
    offset?: Parameters<typeof import("@floating-ui/dom").offset>[0] | boolean;
    flip?: Parameters<typeof import("@floating-ui/dom").flip>[0] | boolean;
    shift?: Parameters<typeof import("@floating-ui/dom").shift>[0] | boolean;
    arrow?: Parameters<typeof import("@floating-ui/dom").arrow>[0] | false;
    size?: Parameters<typeof import("@floating-ui/dom").size>[0] | boolean;
    autoPlacement?: Parameters<typeof import("@floating-ui/dom").autoPlacement>[0] | boolean;
    hide?: Parameters<typeof import("@floating-ui/dom").hide>[0] | boolean;
    inline?: Parameters<typeof import("@floating-ui/dom").inline>[0] | boolean;
    onShow?: () => void;
    onHide?: () => void;
    onUpdate?: () => void;
    onDestroy?: () => void;
    scrollTarget?: HTMLElement | Window;
  } | undefined;
  appendTo: HTMLElement | (() => HTMLElement) | undefined;
  shouldShow: (props: {
    editor: import("@tiptap/core").Editor;
    element: HTMLElement;
    view: import("prosemirror-view").EditorView;
    state: import("prosemirror-state").EditorState;
    oldState?: import("prosemirror-state").EditorState;
    from: number;
    to: number;
  }) => boolean;
  pluginKey: string | PluginKey<any>;
  getReferencedVirtualElement: () => import("@floating-ui/dom").VirtualElement | null;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//#endregion
//#region src/menus/FloatingMenu.d.ts
declare const FloatingMenu: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  pluginKey: {
    type: null;
    default: undefined;
  };
  editor: {
    type: PropType<FloatingMenuPluginProps["editor"]>;
    required: true;
  };
  updateDelay: {
    type: PropType<FloatingMenuPluginProps["updateDelay"]>;
    default: undefined;
  };
  resizeDelay: {
    type: PropType<FloatingMenuPluginProps["resizeDelay"]>;
    default: undefined;
  };
  options: {
    type: PropType<FloatingMenuPluginProps["options"]>;
    default: () => {};
  };
  appendTo: {
    type: PropType<FloatingMenuPluginProps["appendTo"]>;
    default: undefined;
  };
  shouldShow: {
    type: PropType<Exclude<Required<FloatingMenuPluginProps>["shouldShow"], null>>;
    default: null;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  pluginKey: {
    type: null;
    default: undefined;
  };
  editor: {
    type: PropType<FloatingMenuPluginProps["editor"]>;
    required: true;
  };
  updateDelay: {
    type: PropType<FloatingMenuPluginProps["updateDelay"]>;
    default: undefined;
  };
  resizeDelay: {
    type: PropType<FloatingMenuPluginProps["resizeDelay"]>;
    default: undefined;
  };
  options: {
    type: PropType<FloatingMenuPluginProps["options"]>;
    default: () => {};
  };
  appendTo: {
    type: PropType<FloatingMenuPluginProps["appendTo"]>;
    default: undefined;
  };
  shouldShow: {
    type: PropType<Exclude<Required<FloatingMenuPluginProps>["shouldShow"], null>>;
    default: null;
  };
}>> & Readonly<{}>, {
  updateDelay: number | undefined;
  resizeDelay: number | undefined;
  options: {
    strategy?: "absolute" | "fixed";
    placement?: "top" | "right" | "bottom" | "left" | "top-start" | "top-end" | "right-start" | "right-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end";
    offset?: Parameters<typeof import("@floating-ui/dom").offset>[0] | boolean;
    flip?: Parameters<typeof import("@floating-ui/dom").flip>[0] | boolean;
    shift?: Parameters<typeof import("@floating-ui/dom").shift>[0] | boolean;
    arrow?: Parameters<typeof import("@floating-ui/dom").arrow>[0] | false;
    size?: Parameters<typeof import("@floating-ui/dom").size>[0] | boolean;
    autoPlacement?: Parameters<typeof import("@floating-ui/dom").autoPlacement>[0] | boolean;
    hide?: Parameters<typeof import("@floating-ui/dom").hide>[0] | boolean;
    inline?: Parameters<typeof import("@floating-ui/dom").inline>[0] | boolean;
    onShow?: () => void;
    onHide?: () => void;
    onUpdate?: () => void;
    onDestroy?: () => void;
    scrollTarget?: HTMLElement | Window;
  } | undefined;
  appendTo: HTMLElement | (() => HTMLElement) | undefined;
  shouldShow: (props: {
    editor: import("@tiptap/core").Editor;
    view: import("prosemirror-view").EditorView;
    state: import("prosemirror-state").EditorState;
    oldState?: import("prosemirror-state").EditorState;
    from: number;
    to: number;
  }) => boolean;
  pluginKey: any;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//#endregion
export { BubbleMenu, FloatingMenu };
//# sourceMappingURL=index.d.cts.map