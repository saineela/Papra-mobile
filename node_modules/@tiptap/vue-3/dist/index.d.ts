import { Editor as Editor$1, EditorOptions, MarkView, MarkViewProps, MarkViewRenderer, MarkViewRendererOptions, NodeViewProps, NodeViewRenderer, NodeViewRendererOptions, Storage, WidgetDecoration, WidgetDecorationOptions } from "@tiptap/core";
import { AppContext, Component, ComponentInternalInstance, ComponentPublicInstance, PropType, Ref, h } from "vue";
import { EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Node } from "@tiptap/pm/model";
import { Decoration, DecorationSource } from "@tiptap/pm/view";
export * from "@tiptap/core";
//#region src/Editor.d.ts
type ContentComponent = ComponentInternalInstance & {
  ctx: ComponentPublicInstance;
};
declare class Editor extends Editor$1 {
  private reactiveState;
  private reactiveExtensionStorage;
  contentComponent: ContentComponent | null;
  appContext: AppContext | null;
  constructor(options?: Partial<EditorOptions>);
  get state(): EditorState;
  get storage(): Storage;
  /**
   * Register a ProseMirror plugin.
   */
  registerPlugin(plugin: Plugin, handlePlugins?: (newPlugin: Plugin, plugins: Plugin[]) => Plugin[]): EditorState;
  /**
   * Unregister a ProseMirror plugin.
   */
  unregisterPlugin(nameOrPluginKey: string | PluginKey): EditorState | undefined;
}
//#endregion
//#region src/EditorContent.d.ts
declare const EditorContent: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  editor: {
    default: null;
    type: PropType<Editor>;
  };
}>, {
  rootEl: Ref<Element | undefined, Element | undefined>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  editor: {
    default: null;
    type: PropType<Editor>;
  };
}>> & Readonly<{}>, {
  editor: Editor;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//#endregion
//#region src/NodeViewContent.d.ts
declare const NodeViewContent: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  as: {
    type: StringConstructor;
    default: string;
  };
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  as: {
    type: StringConstructor;
    default: string;
  };
}>> & Readonly<{}>, {
  as: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//#endregion
//#region src/NodeViewWrapper.d.ts
declare const NodeViewWrapper: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  as: {
    type: StringConstructor;
    default: string;
  };
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  as: {
    type: StringConstructor;
    default: string;
  };
}>> & Readonly<{}>, {
  as: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//#endregion
//#region src/useEditor.d.ts
declare const useEditor: (options?: Partial<EditorOptions>) => import("vue").ShallowRef<Editor | undefined, Editor | undefined>;
//#endregion
//#region src/VueRenderer.d.ts
interface VueRendererOptions {
  editor: Editor$1;
  props?: Record<string, any>;
}
type ExtendedVNode = ReturnType<typeof h> | null;
interface RenderedComponent {
  vNode: ExtendedVNode;
  destroy: () => void;
  el: Element | null;
}
/**
 * This class is used to render Vue components inside the editor.
 */
declare class VueRenderer {
  renderedComponent: RenderedComponent;
  editor: Editor;
  component: Component;
  el: Element | null;
  props: Record<string, any>;
  /**
   * Flag to track if the renderer has been destroyed, preventing queued or asynchronous renders from executing after teardown.
   */
  destroyed: boolean;
  constructor(component: Component, { props, editor }: VueRendererOptions);
  get element(): Element | null;
  get ref(): any;
  renderComponent(): RenderedComponent;
  updateProps(props?: Record<string, any>): void;
  destroy(): void;
}
//#endregion
//#region src/VueMarkViewRenderer.d.ts
interface VueMarkViewRendererOptions extends MarkViewRendererOptions {
  as?: string;
  className?: string;
  attrs?: {
    [key: string]: string;
  };
}
declare const markViewProps: {
  editor: {
    type: PropType<MarkViewProps["editor"]>;
    required: true;
  };
  mark: {
    type: PropType<MarkViewProps["mark"]>;
    required: true;
  };
  extension: {
    type: PropType<MarkViewProps["extension"]>;
    required: true;
  };
  inline: {
    type: PropType<MarkViewProps["inline"]>;
    required: true;
  };
  view: {
    type: PropType<MarkViewProps["view"]>;
    required: true;
  };
  updateAttributes: {
    type: PropType<MarkViewProps["updateAttributes"]>;
    required: true;
  };
  HTMLAttributes: {
    type: PropType<MarkViewProps["HTMLAttributes"]>;
    required: true;
  };
};
declare const MarkViewContent: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  as: {
    type: StringConstructor;
    default: string;
  };
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  as: {
    type: StringConstructor;
    default: string;
  };
}>> & Readonly<{}>, {
  as: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
declare class VueMarkView extends MarkView<Component, VueMarkViewRendererOptions> {
  renderer: VueRenderer;
  constructor(component: Component, props: MarkViewProps, options?: Partial<VueMarkViewRendererOptions>);
  get dom(): HTMLElement;
  get contentDOM(): HTMLElement | null;
  updateAttributes(attrs: Record<string, any>): void;
  destroy(): void;
}
declare function VueMarkViewRenderer(component: Component, options?: Partial<VueMarkViewRendererOptions>): MarkViewRenderer;
//#endregion
//#region src/VueNodeViewRenderer.d.ts
declare const nodeViewProps: {
  editor: {
    type: PropType<NodeViewProps["editor"]>;
    required: true;
  };
  node: {
    type: PropType<NodeViewProps["node"]>;
    required: true;
  };
  decorations: {
    type: PropType<NodeViewProps["decorations"]>;
    required: true;
  };
  selected: {
    type: PropType<NodeViewProps["selected"]>;
    required: true;
  };
  extension: {
    type: PropType<NodeViewProps["extension"]>;
    required: true;
  };
  getPos: {
    type: PropType<NodeViewProps["getPos"]>;
    required: true;
  };
  updateAttributes: {
    type: PropType<NodeViewProps["updateAttributes"]>;
    required: true;
  };
  deleteNode: {
    type: PropType<NodeViewProps["deleteNode"]>;
    required: true;
  };
  view: {
    type: PropType<NodeViewProps["view"]>;
    required: true;
  };
  innerDecorations: {
    type: PropType<NodeViewProps["innerDecorations"]>;
    required: true;
  };
  HTMLAttributes: {
    type: PropType<NodeViewProps["HTMLAttributes"]>;
    required: true;
  };
};
interface VueNodeViewRendererOptions extends NodeViewRendererOptions {
  update: ((props: {
    oldNode: Node;
    oldDecorations: readonly Decoration[];
    oldInnerDecorations: DecorationSource;
    newNode: Node;
    newDecorations: readonly Decoration[];
    innerDecorations: DecorationSource;
    updateProps: () => void;
  }) => boolean) | null;
}
declare function VueNodeViewRenderer(component: Component<NodeViewProps>, options?: Partial<VueNodeViewRendererOptions>): NodeViewRenderer;
//#endregion
//#region src/VueWidgetRenderer.d.ts
/**
 * Props every widget-decoration component receives in addition to the props you
 * pass through `VueWidgetRenderer`.
 */
interface VueWidgetDecorationProps {
  editor: Editor$1;
  getPos: () => number | undefined;
}
interface VueWidgetRendererOptions<P extends Record<string, any> = object> extends WidgetDecorationOptions {
  /**
   * The editor instance.
   */
  editor: Editor$1;
  /**
   * The document position the widget is rendered at.
   */
  pos: number;
  /**
   * A stable, position-independent identifier for the widget.
   * Reusing the same key keeps the component mounted across re-renders.
   * Good: `comment-${id}`. Bad: paragraph index or document position.
   */
  key: string;
  /**
   * Props passed to the component (merged with {@link VueWidgetDecorationProps}).
   * The component must have a single root element.
   *
   * @remarks Props are deeply wrapped in `reactive()` by `VueRenderer`. The
   *   `editor` is protected with `markRaw`; any other non-reactive objects you
   *   pass (ProseMirror nodes, views, editor refs, ...) are not. Mark them raw
   *   yourself when reactivity would cause recursion or unwanted tracking.
   */
  props?: P;
}
/**
 * Renders a Vue component into a ProseMirror widget decoration.
 * Reuses Tiptap's `VueRenderer` so the component shares the editor's app
 * context (provide/inject works as usual). Use a stable `key` for stateful
 * widgets. The component must render a single root element.
 * @example
 * addDecorations() {
 *   return {
 *     create: ({ editor, state }) =>
 *       findMatches(state.doc).map(match =>
 *         VueWidgetRenderer(MyWidget, {
 *           editor, pos: match.pos, key: `match-${match.id}`,
 *           props: { label: match.label },
 *         }),
 *       ),
 *   }
 * }
 */
declare function VueWidgetRenderer<P extends Record<string, any> = object>(component: Component, options: VueWidgetRendererOptions<P>): WidgetDecoration;
//#endregion
export { Editor, EditorContent, MarkViewContent, NodeViewContent, NodeViewWrapper, VueMarkView, VueMarkViewRenderer, VueMarkViewRendererOptions, VueNodeViewRenderer, VueNodeViewRendererOptions, VueRenderer, VueRendererOptions, VueWidgetDecorationProps, VueWidgetRenderer, VueWidgetRendererOptions, markViewProps, nodeViewProps, useEditor };
//# sourceMappingURL=index.d.ts.map