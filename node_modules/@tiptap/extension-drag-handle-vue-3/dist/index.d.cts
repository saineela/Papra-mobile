import { EditorState, Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import { DOMOutputSpec, Fragment, Mark, MarkSpec, MarkType, Node, NodeSpec, NodeType, ParseOptions, ResolvedPos, Schema, Slice } from "@tiptap/pm/model";
import { Decoration, DecorationAttrs, DecorationSet, EditorProps, EditorView, MarkView, MarkViewConstructor, NodeView, NodeViewConstructor } from "@tiptap/pm/view";
import { MapResult, Transform } from "@tiptap/pm/transform";
import "@tiptap/pm/tables";
import { DragHandlePluginProps, NestedOptions } from "@tiptap/extension-drag-handle";
import { Editor } from "@tiptap/vue-3";
import { PropType } from "vue";
//#region ../core/src/EventEmitter.d.ts
type StringKeyOf<T> = Extract<keyof T, string>;
type CallbackType<T extends Record<string, any>, EventName extends StringKeyOf<T>> = T[EventName] extends any[] ? T[EventName] : [T[EventName]];
type CallbackFunction<T extends Record<string, any>, EventName extends StringKeyOf<T>> = (...props: CallbackType<T, EventName>) => any;
declare class EventEmitter<T extends Record<string, any>> {
  private callbacks;
  on<EventName extends StringKeyOf<T>>(event: EventName, fn: CallbackFunction<T, EventName>): this;
  emit<EventName extends StringKeyOf<T>>(event: EventName, ...args: CallbackType<T, EventName>): this;
  off<EventName extends StringKeyOf<T>>(event: EventName, fn?: CallbackFunction<T, EventName>): this;
  once<EventName extends StringKeyOf<T>>(event: EventName, fn: CallbackFunction<T, EventName>): this;
  removeAllListeners(): void;
}
//#endregion
//#region ../core/src/decorations/Decoration.d.ts
interface WidgetDecorationOptions {
  side?: number;
  relaxedSide?: boolean;
  marks?: readonly Mark[];
  stopEvent?: (event: Event) => boolean;
  ignoreSelection?: boolean;
  /**
   * runs when ProseMirror drops the widget, also on editor destroy and unmount.
   * skipped on teardown for widgets made with the React or Vue widget renderer.
   * receives the DOM node, not a ProseMirror node.
   */
  destroy?: (node: globalThis.Node) => void;
}
type DecorationKind = 'inline' | 'node' | 'widget';
/**
 * Base class for decorations built in `addDecorations()`. Shadows `Decoration`
 * from `@tiptap/pm/view`, like core's `Node` and `Mark` do, so alias one of them
 * in files that need both.
 *
 * @example
 * import { Decoration } from '@tiptap/core'
 * import { Decoration as PMDecoration } from '@tiptap/pm/view'
 *
 * const highlight = Decoration.Inline(1, 5, { class: 'highlight' })
 */
declare abstract class Decoration$1 {
  abstract kind: DecorationKind;
  abstract get anchor(): number;
  /**
   * Builds the ProseMirror decoration. When `extensionName` is provided,
   * it is embedded into the decoration spec for incremental merge tracking.
   * @param extensionName The name of the extension that produced this decoration.
   * @returns The ProseMirror decoration.
   */
  abstract toPMDecoration(extensionName?: string): Decoration;
  static Inline(from: number, to: number, attrs?: DecorationAttrs, spec?: Record<string, any>): InlineDecoration;
  static Node(pos: number, to: number, attrs?: DecorationAttrs, spec?: Record<string, any>): NodeDecoration;
  /**
   * Creates a widget decoration: a DOM node drawn at a document position.
   *
   * The `key` is the widget's identity. While it stays the same, ProseMirror
   * keeps the widget mounted and only its position tracks the document.
   * `render`, `side`, `destroy` and other options are fixed on first mount.
   * Change the key to remount with new options.
   *
   * @param pos The document position where the widget is drawn.
   * @param render Called once on first mount. Returns the DOM node.
   * @param options Must include a unique `key`. See `WidgetDecorationOptions`.
   * @returns The widget decoration.
   */
  static Widget(pos: number, render: (view: EditorView, getPos: () => number | undefined) => HTMLElement, options: {
    key: string;
  } & WidgetDecorationOptions & Record<string, any>): WidgetDecoration;
}
/**
 * Represents an inline decoration (text-level highlighting, etc.).
 */
declare class InlineDecoration extends Decoration$1 {
  kind: "inline";
  from: number;
  to: number;
  attrs: DecorationAttrs;
  spec?: Record<string, any>;
  constructor(from: number, to: number, attrs?: DecorationAttrs, spec?: Record<string, any>);
  get anchor(): number;
  toPMDecoration(extensionName?: string): Decoration;
}
/**
 * Represents a node-level decoration (block-level highlights, etc.).
 */
declare class NodeDecoration extends Decoration$1 {
  kind: "node";
  from: number;
  to: number;
  attrs: DecorationAttrs;
  spec?: Record<string, any>;
  constructor(pos: number, to: number, attrs?: DecorationAttrs, spec?: Record<string, any>);
  get anchor(): number;
  toPMDecoration(extensionName?: string): Decoration;
}
/**
 * Represents a widget decoration (inline widgets, etc.).
 */
declare class WidgetDecoration extends Decoration$1 {
  kind: "widget";
  pos: number;
  key: string;
  render: (view: EditorView, getPos: () => number | undefined) => HTMLElement;
  spec?: WidgetDecorationOptions & Record<string, any>;
  constructor(pos: number, render: (view: EditorView, getPos: () => number | undefined) => HTMLElement, key: string, spec?: WidgetDecorationOptions & Record<string, any>);
  get anchor(): number;
  toPMDecoration(extensionName?: string): Decoration;
}
//#endregion
//#region ../core/src/decorations/types.d.ts
interface DecorationCreateProps {
  /**
   * The editor instance. Read `state` from the `state` argument, not
   * `editor.state` — during `create()` the editor's view state has not been
   * updated yet, so `editor.state` points at the pre-transaction document.
   */
  editor: Editor$1;
  /**
   * The editor state being built. This is the correct state to read from
   * inside `create()`; `editor.state` is stale until the transaction finishes
   * applying.
   */
  state: EditorState;
  /** The editor view, or `null` while the editor is not mounted. */
  view: EditorView | null;
}
interface DecorationShouldUpdateProps {
  editor: Editor$1;
  tr: Transaction;
  oldState: EditorState;
  newState: EditorState;
}
interface DecorationRangeProps extends DecorationCreateProps {
  /** Start of the block range to scan, inclusive. */
  from: number;
  /**
   * End of the block range to scan, exclusive. `to` is the next block's start
   * and that block rebuilds it, so decorations anchored there are ignored.
   * The last block is the exception: it owns the end of the document.
   */
  to: number;
}
interface BaseDecorationSpec {
  create: (props: DecorationCreateProps) => Decoration$1[];
  shouldUpdate?: (props: DecorationShouldUpdateProps) => boolean;
}
interface DocumentDecorationSpec extends BaseDecorationSpec {
  update?: 'document';
  createInRange?: never;
}
interface ChangedRangesDecorationSpec extends BaseDecorationSpec {
  update: 'changedRanges';
  createInRange: (props: DecorationRangeProps) => Decoration$1[];
}
interface ManualDecorationSpec extends BaseDecorationSpec {
  update: 'manual';
  shouldUpdate?: never;
  createInRange?: never;
}
type DecorationSpec = DocumentDecorationSpec | ChangedRangesDecorationSpec | ManualDecorationSpec;
interface DecorationManagerState {
  decorationSetsByExtension: Record<string, DecorationSet>;
  widgetKeysByExtension: Record<string, Set<string>>;
  mergedDecorationSet: DecorationSet;
  widgetKeys: Set<string>;
}
interface ResolvedDecorationEntry {
  name: string;
  spec: DecorationSpec;
}
interface DecorationManagerEntry {
  name: string;
  addDecorations: () => DecorationSpec | null;
}
//#endregion
//#region ../core/src/decorations/DecorationManager.d.ts
declare class DecorationManager {
  editor: Editor$1;
  entries: ResolvedDecorationEntry[];
  plugin: Plugin<DecorationManagerState> | null;
  private warnedWidgetKeys;
  private warnedOutOfRangeExtensions;
  private readonly handleBeforeTransaction;
  constructor(options: {
    editor: Editor$1;
    entries: DecorationManagerEntry[];
  });
  destroy(): void;
  /**
   * Returns the set of live widget keys from all decoration extensions.
   * @returns A readonly set of widget keys
   */
  liveWidgetKeys(): ReadonlySet<string>;
  /**
   * The mounted editor view, or `null` when destroyed. Decoration callbacks
   * must never receive the placeholder view `editor.view` falls back to.
   * @returns The mounted editor view, or `null`
   */
  private get mountedView();
  /**
   * Resolves decoration entries by calling the addDecorations function for each extension entry.
   * @param entries The decoration manager entries to resolve
   * @returns An array of resolved decoration entries
   */
  private resolveEntries;
  /**
   * Creates the ProseMirror plugin for managing decorations.
   * @returns A ProseMirror plugin with state management
   */
  private createPlugin;
  /**
   * Applies changed ranges recomputation to a decoration set, dropping stale decorations and rebuilding only the touched blocks.
   * @param name The name of the decoration extension
   * @param spec The decoration spec
   * @param previous The previous decoration manager state
   * @param tr The transaction to apply
   * @param newState The new editor state
   * @returns The updated decoration set and widget keys
   */
  private applyChangedRangesRecompute;
  /**
   * Rebuilds decorations for the changed block ranges: maps the previous set
   * forward, then for each range removes stale decorations, calls
   * `createInRange`, and adds the new ones while syncing widget keys.
   * @param name The extension name.
   * @param spec The decoration spec.
   * @param previous The previous decoration manager state.
   * @param tr The transaction to apply.
   * @param newState The new editor state.
   * @param ranges The block ranges to rebuild.
   * @returns The updated decoration set and widget keys.
   */
  private rebuildRanges;
  /**
   * Builds a full decoration set for the entire document.
   * @param name The name of the decoration extension
   * @param spec The decoration spec
   * @param state The editor state
   * @returns The decoration set and widget keys
   */
  private buildFullSet;
  /**
   * Runs a decoration callback and swallows anything it throws. These run inside
   * `state.apply`, where an uncaught error would abort the whole transaction.
   * @param name The extension name.
   * @param method The callback name, used in the error message.
   * @param create The callback to run.
   * @returns The decorations, or an empty array if the callback threw.
   */
  private runCreate;
  private warnDuplicateWidgetKeys;
  /**
   * Builds the merged DecorationSet during init. Skips the merge for a
   * single extension since its per-extension set is already correct.
   * @param doc The document to build the merged set for.
   * @param decorationSetsByExtension The per-extension decoration sets.
   * @returns The merged decoration set.
   */
  private buildMergedSet;
  /**
   * Computes the merged DecorationSet after apply. Single extension skips the
   * merge; nothing recomputed maps the previous merged set forward; otherwise
   * the merge is rebuilt from the per-extension sets.
   */
  private mergeAfterApply;
}
//#endregion
//#region ../core/src/InputRule.d.ts
type InputRuleMatch = {
  index: number;
  text: string;
  replaceWith?: string;
  match?: RegExpMatchArray;
  data?: Record<string, any>;
};
type InputRuleFinder = RegExp | ((text: string) => InputRuleMatch | null);
declare class InputRule {
  find: InputRuleFinder;
  handler: (props: {
    state: EditorState;
    range: Range;
    match: ExtendedRegExpMatchArray;
    commands: SingleCommands;
    chain: () => ChainedCommands;
    can: () => CanCommands;
  }) => void | null;
  undoable: boolean;
  constructor(config: {
    find: InputRuleFinder;
    handler: (props: {
      state: EditorState;
      range: Range;
      match: ExtendedRegExpMatchArray;
      commands: SingleCommands;
      chain: () => ChainedCommands;
      can: () => CanCommands;
    }) => void | null;
    undoable?: boolean;
  });
}
//#endregion
//#region ../core/src/Mark.d.ts
interface MarkConfig<Options = any, Storage = any> extends ExtendableConfig<Options, Storage, MarkConfig<Options, Storage>, MarkType> {
  /**
   * Mark View
   */
  addMarkView?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: MarkType;
    parent: ParentConfig<MarkConfig<Options, Storage>>['addMarkView'];
  }) => MarkViewRenderer) | null;
  /**
   * Keep mark after split node
   */
  keepOnSplit?: boolean | (() => boolean);
  /**
   * Whether this mark is removed by `unsetAllMarks`.
   * Set to `false` for semantic marks (comments, suggestions) that should survive "clear formatting".
   * @default true
   */
  clearable?: boolean | (() => boolean);
  /**
   * Inclusive
   */
  inclusive?: MarkSpec['inclusive'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<MarkConfig<Options, Storage>>['inclusive'];
    editor?: Editor$1;
  }) => MarkSpec['inclusive']);
  /**
   * Excludes
   */
  excludes?: MarkSpec['excludes'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<MarkConfig<Options, Storage>>['excludes'];
    editor?: Editor$1;
  }) => MarkSpec['excludes']);
  /**
   * Marks this Mark as exitable
   */
  exitable?: boolean | (() => boolean);
  /**
   * Group
   */
  group?: MarkSpec['group'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<MarkConfig<Options, Storage>>['group'];
    editor?: Editor$1;
  }) => MarkSpec['group']);
  /**
   * Spanning
   */
  spanning?: MarkSpec['spanning'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<MarkConfig<Options, Storage>>['spanning'];
    editor?: Editor$1;
  }) => MarkSpec['spanning']);
  /**
   * Code
   */
  code?: boolean | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<MarkConfig<Options, Storage>>['code'];
    editor?: Editor$1;
  }) => boolean);
  /**
   * Parse HTML
   */
  parseHTML?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<MarkConfig<Options, Storage>>['parseHTML'];
    editor?: Editor$1;
  }) => MarkSpec['parseDOM'];
  /**
   * Render HTML
   */
  renderHTML?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<MarkConfig<Options, Storage>>['renderHTML'];
    editor?: Editor$1;
  }, props: {
    mark: Mark;
    HTMLAttributes: Record<string, any>;
  }) => DOMOutputSpec) | null;
  /**
   * Attributes
   */
  addAttributes?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<MarkConfig<Options, Storage>>['addAttributes'];
    editor?: Editor$1;
  }) => Attributes | {};
}
/**
 * The Mark class is used to create custom mark extensions.
 * @see https://tiptap.dev/api/extensions#create-a-new-extension
 */
declare class Mark$1<Options = any, Storage = any> extends Extendable<Options, Storage, MarkConfig<Options, Storage>> {
  type: string;
  /**
   * Create a new Mark instance
   * @param config - Mark configuration object or a function that returns a configuration object
   */
  static create<O = any, S = any>(config?: Partial<MarkConfig<O, S>> | (() => Partial<MarkConfig<O, S>>)): Mark$1<O, S>;
  static handleExit({ editor, mark }: {
    editor: Editor$1;
    mark: Mark$1;
  }): boolean;
  configure(options?: Partial<Options>): Mark$1<Options, Storage>;
  extend<ExtendedOptions = Options, ExtendedStorage = Storage, ExtendedConfig extends MarkConfig<ExtendedOptions, ExtendedStorage> = MarkConfig<ExtendedOptions, ExtendedStorage>>(extendedConfig?: (() => Partial<ExtendedConfig>) | (Partial<ExtendedConfig> & ThisType<{
    name: string;
    options: ExtendedOptions;
    storage: ExtendedStorage;
    editor: Editor$1;
    type: MarkType;
  }>)): Mark$1<ExtendedOptions, ExtendedStorage>;
}
//#endregion
//#region ../core/src/Node.d.ts
interface NodeConfig<Options = any, Storage = any> extends ExtendableConfig<Options, Storage, NodeConfig<Options, Storage>, NodeType> {
  /**
   * Node View
   */
  addNodeView?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: NodeType;
    parent: ParentConfig<NodeConfig<Options, Storage>>['addNodeView'];
  }) => NodeViewRenderer | null) | null;
  /**
   * Defines if this node should be a top level node (doc)
   * @default false
   * @example true
   */
  topNode?: boolean;
  /**
   * The content expression for this node, as described in the [schema
   * guide](/docs/guide/#schema.content_expressions). When not given,
   * the node does not allow any content.
   *
   * You can read more about it on the Prosemirror documentation here
   * @see https://prosemirror.net/docs/guide/#schema.content_expressions
   * @default undefined
   * @example content: 'block+'
   * @example content: 'headline paragraph block*'
   */
  content?: NodeSpec['content'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['content'];
    editor?: Editor$1;
  }) => NodeSpec['content']);
  /**
   * The marks that are allowed inside of this node. May be a
   * space-separated string referring to mark names or groups, `"_"`
   * to explicitly allow all marks, or `""` to disallow marks. When
   * not given, nodes with inline content default to allowing all
   * marks, other nodes default to not allowing marks.
   *
   * @example marks: 'strong em'
   */
  marks?: NodeSpec['marks'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['marks'];
    editor?: Editor$1;
  }) => NodeSpec['marks']);
  /**
   * The group or space-separated groups to which this node belongs,
   * which can be referred to in the content expressions for the
   * schema.
   *
   * By default Tiptap uses the groups 'block' and 'inline' for nodes. You
   * can also use custom groups if you want to group specific nodes together
   * and handle them in your schema.
   * @example group: 'block'
   * @example group: 'inline'
   * @example group: 'customBlock' // this uses a custom group
   */
  group?: NodeSpec['group'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['group'];
    editor?: Editor$1;
  }) => NodeSpec['group']);
  /**
   * Should be set to true for inline nodes. (Implied for text nodes.)
   */
  inline?: NodeSpec['inline'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['inline'];
    editor?: Editor$1;
  }) => NodeSpec['inline']);
  /**
   * Can be set to true to indicate that, though this isn't a [leaf
   * node](https://prosemirror.net/docs/ref/#model.NodeType.isLeaf), it doesn't have directly editable
   * content and should be treated as a single unit in the view.
   *
   * @example atom: true
   */
  atom?: NodeSpec['atom'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['atom'];
    editor?: Editor$1;
  }) => NodeSpec['atom']);
  /**
   * Controls whether nodes of this type can be selected as a [node
   * selection](https://prosemirror.net/docs/ref/#state.NodeSelection). Defaults to true for non-text
   * nodes.
   *
   * @default true
   * @example selectable: false
   */
  selectable?: NodeSpec['selectable'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['selectable'];
    editor?: Editor$1;
  }) => NodeSpec['selectable']);
  /**
   * Determines whether nodes of this type can be dragged without
   * being selected. Defaults to false.
   *
   * @default: false
   * @example: draggable: true
   */
  draggable?: NodeSpec['draggable'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['draggable'];
    editor?: Editor$1;
  }) => NodeSpec['draggable']);
  /**
   * Can be used to indicate that this node contains code, which
   * causes some commands to behave differently.
   */
  code?: NodeSpec['code'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['code'];
    editor?: Editor$1;
  }) => NodeSpec['code']);
  /**
   * Controls way whitespace in this a node is parsed. The default is
   * `"normal"`, which causes the [DOM parser](https://prosemirror.net/docs/ref/#model.DOMParser) to
   * collapse whitespace in normal mode, and normalize it (replacing
   * newlines and such with spaces) otherwise. `"pre"` causes the
   * parser to preserve spaces inside the node. When this option isn't
   * given, but [`code`](https://prosemirror.net/docs/ref/#model.NodeSpec.code) is true, `whitespace`
   * will default to `"pre"`. Note that this option doesn't influence
   * the way the node is rendered—that should be handled by `toDOM`
   * and/or styling.
   */
  whitespace?: NodeSpec['whitespace'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['whitespace'];
    editor?: Editor$1;
  }) => NodeSpec['whitespace']);
  /**
   * Allows a **single** node to be set as linebreak equivalent (e.g. hardBreak).
   * When converting between block types that have whitespace set to "pre"
   * and don't support the linebreak node (e.g. codeBlock) and other block types
   * that do support the linebreak node (e.g. paragraphs) - this node will be used
   * as the linebreak instead of stripping the newline.
   *
   * See [linebreakReplacement](https://prosemirror.net/docs/ref/#model.NodeSpec.linebreakReplacement).
   */
  linebreakReplacement?: NodeSpec['linebreakReplacement'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['linebreakReplacement'];
    editor?: Editor$1;
  }) => NodeSpec['linebreakReplacement']);
  /**
   * When enabled, enables both
   * [`definingAsContext`](https://prosemirror.net/docs/ref/#model.NodeSpec.definingAsContext) and
   * [`definingForContent`](https://prosemirror.net/docs/ref/#model.NodeSpec.definingForContent).
   *
   * @default false
   * @example isolating: true
   */
  defining?: NodeSpec['defining'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['defining'];
    editor?: Editor$1;
  }) => NodeSpec['defining']);
  /**
   * When enabled (default is false), the sides of nodes of this type
   * count as boundaries that regular editing operations, like
   * backspacing or lifting, won't cross. An example of a node that
   * should probably have this enabled is a table cell.
   */
  isolating?: NodeSpec['isolating'] | ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['isolating'];
    editor?: Editor$1;
  }) => NodeSpec['isolating']);
  /**
   * Associates DOM parser information with this node, which can be
   * used by [`DOMParser.fromSchema`](https://prosemirror.net/docs/ref/#model.DOMParser^fromSchema) to
   * automatically derive a parser. The `node` field in the rules is
   * implied (the name of this node will be filled in automatically).
   * If you supply your own parser, you do not need to also specify
   * parsing rules in your schema.
   *
   * @example parseHTML: [{ tag: 'div', attrs: { 'data-id': 'my-block' } }]
   */
  parseHTML?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['parseHTML'];
    editor?: Editor$1;
  }) => NodeSpec['parseDOM'];
  /**
   * A description of a DOM structure. Can be either a string, which is
   * interpreted as a text node, a DOM node, which is interpreted as
   * itself, a `{dom, contentDOM}` object, or an array.
   *
   * An array describes a DOM element. The first value in the array
   * should be a string—the name of the DOM element, optionally prefixed
   * by a namespace URL and a space. If the second element is plain
   * object, it is interpreted as a set of attributes for the element.
   * Any elements after that (including the 2nd if it's not an attribute
   * object) are interpreted as children of the DOM elements, and must
   * either be valid `DOMOutputSpec` values, or the number zero.
   *
   * The number zero (pronounced “hole”) is used to indicate the place
   * where a node's child nodes should be inserted. If it occurs in an
   * output spec, it should be the only child element in its parent
   * node.
   *
   * @example toDOM: ['div[data-id="my-block"]', { class: 'my-block' }, 0]
   */
  renderHTML?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['renderHTML'];
    editor?: Editor$1;
  }, props: {
    node: Node;
    HTMLAttributes: Record<string, any>;
  }) => DOMOutputSpec) | null;
  /**
   * renders the node as text
   * @example renderText: () => 'foo
   */
  renderText?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['renderText'];
    editor?: Editor$1;
  }, props: {
    node: Node;
    pos: number;
    parent: Node;
    index: number;
  }) => string) | null;
  /**
   * Add attributes to the node
   * @example addAttributes: () => ({ class: 'foo' })
   */
  addAttributes?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<NodeConfig<Options, Storage>>['addAttributes'];
    editor?: Editor$1;
  }) => Attributes | {};
}
/**
 * The Node class is used to create custom node extensions.
 * @see https://tiptap.dev/api/extensions#create-a-new-extension
 */
declare class Node$1<Options = any, Storage = any> extends Extendable<Options, Storage, NodeConfig<Options, Storage>> {
  type: string;
  /**
   * Create a new Node instance
   * @param config - Node configuration object or a function that returns a configuration object
   */
  static create<O = any, S = any>(config?: Partial<NodeConfig<O, S>> | (() => Partial<NodeConfig<O, S>>)): Node$1<O, S>;
  configure(options?: Partial<Options>): Node$1<Options, Storage>;
  extend<ExtendedOptions = Options, ExtendedStorage = Storage, ExtendedConfig extends NodeConfig<ExtendedOptions, ExtendedStorage> = NodeConfig<ExtendedOptions, ExtendedStorage>>(extendedConfig?: (() => Partial<ExtendedConfig>) | (Partial<ExtendedConfig> & ThisType<{
    name: string;
    options: ExtendedOptions;
    storage: ExtendedStorage;
    editor: Editor$1;
    type: NodeType;
  }>)): Node$1<ExtendedOptions, ExtendedStorage>;
}
//#endregion
//#region ../core/src/PasteRule.d.ts
type PasteRuleMatch = {
  index: number;
  text: string;
  replaceWith?: string;
  match?: RegExpMatchArray;
  data?: Record<string, any>;
};
type PasteRuleFinder = RegExp | ((text: string, event?: ClipboardEvent | null) => PasteRuleMatch[] | null | undefined);
/**
 * Paste rules are used to react to pasted content.
 * @see https://tiptap.dev/docs/editor/extensions/custom-extensions/extend-existing#paste-rules
 */
declare class PasteRule {
  find: PasteRuleFinder;
  handler: (props: {
    state: EditorState;
    range: Range;
    match: ExtendedRegExpMatchArray;
    commands: SingleCommands;
    chain: () => ChainedCommands;
    can: () => CanCommands;
    pasteEvent: ClipboardEvent | null;
    dropEvent: DragEvent | null;
  }) => void | null;
  constructor(config: {
    find: PasteRuleFinder;
    handler: (props: {
      can: () => CanCommands;
      chain: () => ChainedCommands;
      commands: SingleCommands;
      dropEvent: DragEvent | null;
      match: ExtendedRegExpMatchArray;
      pasteEvent: ClipboardEvent | null;
      range: Range;
      state: EditorState;
    }) => void | null;
  });
}
//#endregion
//#region ../core/src/Extendable.d.ts
interface ExtendableConfig<Options = any, Storage = any, Config extends ExtensionConfig<Options, Storage> | NodeConfig<Options, Storage> | MarkConfig<Options, Storage> | ExtendableConfig<Options, Storage> = ExtendableConfig<Options, Storage, any, any>, PMType = any> {
  /**
   * The extension name - this must be unique.
   * It will be used to identify the extension.
   *
   * @example 'myExtension'
   */
  name: string;
  /**
   * The priority of your extension. The higher, the earlier it will be called
   * and will take precedence over other extensions with a lower priority.
   * @default 100
   * @example 101
   */
  priority?: number;
  /**
   * This method will add options to this extension
   * @see https://tiptap.dev/docs/editor/guide/custom-extensions#settings
   * @example
   * addOptions() {
   *  return {
   *    myOption: 'foo',
   *    myOtherOption: 10,
   * }
   */
  addOptions?: (this: {
    name: string;
    parent: ParentConfig<Config>['addOptions'];
  }) => Options;
  /**
   * The default storage this extension can save data to.
   * @see https://tiptap.dev/docs/editor/guide/custom-extensions#storage
   * @example
   * defaultStorage: {
   *   prefetchedUsers: [],
   *   loading: false,
   * }
   */
  addStorage?: (this: {
    name: string;
    options: Options;
    parent: ParentConfig<Config>['addStorage'];
  }) => Storage;
  /**
     * This function adds globalAttributes to specific nodes.
     * @see https://tiptap.dev/docs/editor/guide/custom-extensions#global-attributes
     * @example
     * addGlobalAttributes() {
     *   return [
     *     {
             // Extend the following extensions
     *       types: [
     *         'heading',
     *         'paragraph',
     *       ],
     *       // … with those attributes
     *       attributes: {
     *         textAlign: {
     *           default: 'left',
     *           renderHTML: attributes => ({
     *             style: `text-align: ${attributes.textAlign}`,
     *           }),
     *           parseHTML: element => element.style.textAlign || 'left',
     *         },
     *       },
     *     },
     *   ]
     * }
     */
  addGlobalAttributes?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    extensions: (Node$1 | Mark$1)[];
    parent: ParentConfig<Config>['addGlobalAttributes'];
  }) => GlobalAttributes;
  /**
   * This function adds commands to the editor
   * @see https://tiptap.dev/docs/editor/guide/custom-extensions#commands
   * @example
   * addCommands() {
   *   return {
   *     myCommand: () => ({ chain }) => chain().setMark('type', 'foo').run(),
   *   }
   * }
   */
  addCommands?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['addCommands'];
  }) => Partial<RawCommands>;
  /**
   * This function registers keyboard shortcuts.
   * @see https://tiptap.dev/docs/editor/guide/custom-extensions#keyboard-shortcuts
   * @example
   * addKeyboardShortcuts() {
   *   return {
   *     'Mod-l': () => this.editor.commands.toggleBulletList(),
   *   }
   * },
   */
  addKeyboardShortcuts?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['addKeyboardShortcuts'];
  }) => {
    [key: string]: KeyboardShortcutCommand;
  };
  /**
   * This function adds input rules to the editor.
   * @see https://tiptap.dev/docs/editor/guide/custom-extensions#input-rules
   * @example
   * addInputRules() {
   *   return [
   *     markInputRule({
   *       find: inputRegex,
   *       type: this.type,
   *     }),
   *   ]
   * },
   */
  addInputRules?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['addInputRules'];
  }) => InputRule[];
  /**
   * This function adds paste rules to the editor.
   * @see https://tiptap.dev/docs/editor/guide/custom-extensions#paste-rules
   * @example
   * addPasteRules() {
   *   return [
   *     markPasteRule({
   *       find: pasteRegex,
   *       type: this.type,
   *     }),
   *   ]
   * },
   */
  addPasteRules?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['addPasteRules'];
  }) => PasteRule[];
  /**
   * This function adds Prosemirror plugins to the editor
   * @see https://tiptap.dev/docs/editor/guide/custom-extensions#prosemirror-plugins
   * @example
   * addProseMirrorPlugins() {
   *   return [
   *     customPlugin(),
   *   ]
   * }
   */
  addProseMirrorPlugins?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['addProseMirrorPlugins'];
  }) => Plugin[];
  /**
   * Adds editor decorations (node, inline, widget). Return a spec with a `create`
   * function that builds instances via `Decoration.Node`/`Inline`/`Widget`. Use
   * `shouldUpdate`, `update: 'changedRanges'` + `createInRange`, or `update: 'manual'` to control recomputation.
   * @see https://tiptap.dev/docs/editor/core-concepts/decorations
   * @example
   * addDecorations() {
   *   return {
   *     create: ({ state }) =>
   *       findChildren(state.doc, node => node.type.name === 'heading').map(
   *         ({ pos, node }) =>
   *           Decoration.Node(pos, pos + node.nodeSize, { class: 'is-heading' }),
   *       ),
   *   }
   * }
   *
   * For framework widgets, use `ReactWidgetRenderer` or `VueWidgetRenderer`
   * from the matching framework package. Give stateful widgets a stable key.
   *
   * `create` and `createInRange` must not throw. An exception escapes through
   * `editor.commands.*` and stops the document from updating until it stops.
   */
  addDecorations?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['addDecorations'];
  }) => DecorationSpec | null;
  /**
   * This function transforms pasted HTML content before it's parsed.
   * Extensions can use this to modify or clean up pasted HTML.
   * The transformations are chained - each extension's transform receives
   * the output from the previous extension's transform.
   * @see https://tiptap.dev/docs/editor/guide/custom-extensions#transform-pasted-html
   * @example
   * transformPastedHTML(html) {
   *   // Remove all style attributes
   *   return html.replace(/style="[^"]*"/g, '')
   * }
   */
  transformPastedHTML?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['transformPastedHTML'];
  }, html: string) => string;
  /**
   * This function adds additional extensions to the editor. This is useful for
   * building extension kits.
   * @example
   * addExtensions() {
   *   return [
   *     BulletList,
   *     OrderedList,
   *     ListItem
   *   ]
   * }
   */
  addExtensions?: (this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<Config>['addExtensions'];
  }) => Extensions;
  /**
   * The markdown token name
   *
   * This is the name of the token that this extension uses to parse and render markdown and comes from the Marked Lexer.
   *
   * @see https://github.com/markedjs/marked/blob/master/src/Tokens.ts
   *
   */
  markdownTokenName?: string;
  /**
   * The parse function used by the markdown parser to convert markdown tokens to ProseMirror nodes.
   */
  parseMarkdown?: (token: MarkdownToken, helpers: MarkdownParseHelpers) => MarkdownParseResult;
  /**
   * The serializer function used by the markdown serializer to convert ProseMirror nodes to markdown tokens.
   */
  renderMarkdown?: (node: JSONContent, helpers: MarkdownRendererHelpers, ctx: RenderContext) => string;
  /**
   * The markdown tokenizer responsible for turning a markdown string into tokens
   *
   * Custom tokenizers are only needed when you want to parse non-standard markdown token.
   */
  markdownTokenizer?: MarkdownTokenizer;
  /**
   * Optional markdown options for indentation
   */
  markdownOptions?: {
    /**
     * Defines if this markdown element should indent it's child elements
     */
    indentsContent?: boolean;
    /**
     * Lets a mark tell the Markdown serializer which inline HTML tags it can
     * safely use when plain markdown delimiters would become ambiguous.
     *
     * This is mainly useful for overlapping marks. For example, bold followed
     * by bold+italic followed by italic cannot always be written back with only
     * `*` and `**` in a way that still parses correctly. In that case, the
     * serializer can close the overlapping section with markdown and reopen the
     * remaining tail with HTML instead.
     *
     * Example:
     * - desired formatting: `**123` + `*456*` + `789 italic`
     * - serialized result: `**123*456***<em>789</em>`
     *
     * If your extension defines custom mark names, set `htmlReopen` on that
     * extension so the serializer can reuse its HTML form for overlap cases.
     */
    htmlReopen?: {
      open: string;
      close: string;
    };
  };
  /**
   * This function extends the schema of the node.
   * @example
   * extendNodeSchema() {
   *   return {
   *     group: 'inline',
   *     selectable: false,
   *   }
   * }
   */
  extendNodeSchema?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<Config>['extendNodeSchema'];
  }, extension: Node$1) => Record<string, any>) | null;
  /**
   * This function extends the schema of the mark.
   * @example
   * extendMarkSchema() {
   *   return {
   *     group: 'inline',
   *     selectable: false,
   *   }
   * }
   */
  extendMarkSchema?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    parent: ParentConfig<Config>['extendMarkSchema'];
  }, extension: Mark$1) => Record<string, any>) | null;
  /**
   * The editor is not ready yet.
   */
  onBeforeCreate?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['onBeforeCreate'];
  }, event: EditorEvents['beforeCreate']) => void) | null;
  /**
   * The editor is ready.
   */
  onCreate?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['onCreate'];
  }, event: EditorEvents['create']) => void) | null;
  /**
   * The content has changed.
   */
  onUpdate?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['onUpdate'];
  }, event: EditorEvents['update']) => void) | null;
  /**
   * The selection has changed.
   */
  onSelectionUpdate?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['onSelectionUpdate'];
  }, event: EditorEvents['selectionUpdate']) => void) | null;
  /**
   * The editor state has changed.
   */
  onTransaction?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['onTransaction'];
  }, event: EditorEvents['transaction']) => void) | null;
  /**
   * The editor is focused.
   */
  onFocus?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['onFocus'];
  }, event: EditorEvents['focus']) => void) | null;
  /**
   * The editor isn’t focused anymore.
   */
  onBlur?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['onBlur'];
  }, event: EditorEvents['blur']) => void) | null;
  /**
   * The editor is destroyed.
   */
  onDestroy?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['onDestroy'];
  }, event: EditorEvents['destroy']) => void) | null;
  /**
   * This hook allows you to intercept and modify transactions before they are dispatched.
   *
   * Example
   * ```ts
   * dispatchTransaction({ transaction, next }) {
   *   console.log('Dispatching transaction:', transaction)
   *   next(transaction)
   * }
   * ```
   *
   * @param props - The dispatch transaction props
   */
  dispatchTransaction?: ((this: {
    name: string;
    options: Options;
    storage: Storage;
    editor: Editor$1;
    type: PMType;
    parent: ParentConfig<Config>['dispatchTransaction'];
  }, props: DispatchTransactionProps) => void) | null;
}
declare class Extendable<Options = any, Storage = any, Config = ExtensionConfig<Options, Storage> | NodeConfig<Options, Storage> | MarkConfig<Options, Storage>> {
  type: string;
  parent: Extendable | null;
  child: Extendable | null;
  name: string;
  config: Config;
  constructor(config?: Partial<Config>);
  get options(): Options;
  get storage(): Readonly<Storage>;
  configure(options?: Partial<Options>): Extendable<Options, Storage, ExtensionConfig<Options, Storage> | NodeConfig<Options, Storage> | MarkConfig<Options, Storage>>;
  extend<ExtendedOptions = Options, ExtendedStorage = Storage, ExtendedConfig = ExtensionConfig<ExtendedOptions, ExtendedStorage> | NodeConfig<ExtendedOptions, ExtendedStorage> | MarkConfig<ExtendedOptions, ExtendedStorage>>(extendedConfig?: Partial<ExtendedConfig>): Extendable<ExtendedOptions, ExtendedStorage>;
}
//#endregion
//#region ../core/src/Extension.d.ts
interface ExtensionConfig<Options = any, Storage = any> extends ExtendableConfig<Options, Storage, ExtensionConfig<Options, Storage>, null> {}
//#endregion
//#region ../core/src/helpers/MappablePosition.d.ts
/**
 * A class that represents a mappable position in the editor. It can be extended
 * by other extensions to add additional position mapping capabilities.
 */
declare class MappablePosition {
  /**
   * The absolute position in the editor.
   */
  position: number;
  constructor(position: number);
  /**
   * Creates a MappablePosition from a JSON object.
   */
  static fromJSON(json: any): MappablePosition;
  /**
   * Converts the MappablePosition to a JSON object.
   */
  toJSON(): any;
}
/**
 * The result of the getUpdatedPosition function.
 */
interface GetUpdatedPositionResult {
  position: MappablePosition;
  mapResult: MapResult | null;
}
//#endregion
//#region ../core/src/types.d.ts
type AnyExtension = Extendable;
type Extensions = AnyExtension[];
type ParentConfig<T> = Partial<{ [P in keyof T]: Required<T>[P] extends ((...args: any) => any) ? (...args: Parameters<Required<T>[P]>) => ReturnType<Required<T>[P]> : T[P]; }>;
interface EditorEvents {
  mount: {
    /**
     * The editor instance
     */
    editor: Editor$1;
  };
  unmount: {
    /**
     * The editor instance
     */
    editor: Editor$1;
  };
  beforeCreate: {
    /**
     * The editor instance
     */
    editor: Editor$1;
  };
  create: {
    /**
     * The editor instance
     */
    editor: Editor$1;
  };
  contentError: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The error that occurred while parsing the content
     */
    error: Error;
    /**
     * If called, will re-initialize the editor with the collaboration extension removed.
     * This will prevent syncing back deletions of content not present in the current schema.
     */
    disableCollaboration: () => void;
  };
  update: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The transaction that caused the update
     */
    transaction: Transaction;
    /**
     * Appended transactions that were added to the initial transaction by plugins
     */
    appendedTransactions: Transaction[];
  };
  selectionUpdate: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The transaction that caused the selection update
     */
    transaction: Transaction;
  };
  beforeTransaction: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The transaction that will be applied
     */
    transaction: Transaction;
    /**
     * The next state of the editor after the transaction is applied
     */
    nextState: EditorState;
  };
  transaction: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The initial transaction
     */
    transaction: Transaction;
    /**
     * Appended transactions that were added to the initial transaction by plugins
     */
    appendedTransactions: Transaction[];
  };
  focus: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The focus event
     */
    event: FocusEvent;
    /**
     * The transaction that caused the focus
     */
    transaction: Transaction;
  };
  blur: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The focus event
     */
    event: FocusEvent;
    /**
     * The transaction that caused the blur
     */
    transaction: Transaction;
  };
  destroy: void;
  paste: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The clipboard event
     */
    event: ClipboardEvent;
    /**
     * The slice that was pasted
     */
    slice: Slice;
  };
  drop: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The drag event
     */
    event: DragEvent;
    /**
     * The slice that was dropped
     */
    slice: Slice;
    /**
     * Whether the content was moved (true) or copied (false)
     */
    moved: boolean;
  };
  delete: {
    /**
     * The editor instance
     */
    editor: Editor$1;
    /**
     * The range of the deleted content (before the deletion)
     */
    deletedRange: Range;
    /**
     * The new range of positions of where the deleted content was in the new document (after the deletion)
     */
    newRange: Range;
    /**
     * The transaction that caused the deletion
     */
    transaction: Transaction;
    /**
     * The combined transform (including all appended transactions) that caused the deletion
     */
    combinedTransform: Transform;
    /**
     * Whether the deletion was partial (only a part of this content was deleted)
     */
    partial: boolean;
    /**
     * This is the start position of the mark in the document (before the deletion)
     */
    from: number;
    /**
     * This is the end position of the mark in the document (before the deletion)
     */
    to: number;
  } & ({
    /**
     * The content that was deleted
     */
    type: 'node';
    /**
     * The node which the deletion occurred in
     * @note This can be a parent node of the deleted content
     */
    node: Node;
    /**
     * The new start position of the node in the document (after the deletion)
     */
    newFrom: number;
    /**
     * The new end position of the node in the document (after the deletion)
     */
    newTo: number;
  } | {
    /**
     * The content that was deleted
     */
    type: 'mark';
    /**
     * The mark that was deleted
     */
    mark: Mark;
  });
}
/**
 * Props passed to the `dispatchTransaction` hook in extensions.
 */
type DispatchTransactionProps = {
  /**
   * The transaction that is about to be dispatched.
   */
  transaction: Transaction;
  /**
   * A function that should be called to pass the transaction down to the next extension
   * (or eventually to the editor).
   *
   * @param transaction The transaction to dispatch
   */
  next: (transaction: Transaction) => void;
};
type EnableRules = (AnyExtension | string)[] | boolean;
interface EditorOptions {
  /**
   * The element to bind the editor to:
   * - If an `Element` is passed, the editor will be mounted appended to that element
   * - If `null` is passed, the editor will not be mounted automatically
   * - If an object with a `mount` property is passed, the editor will be mounted to that element
   * - If a function is passed, it will be called with the editor's element, which should place the editor within the document
   */
  element: Element | {
    mount: HTMLElement;
  } | ((editor: HTMLElement) => void) | null;
  /**
   * The content of the editor (HTML, JSON, or a JSON array)
   */
  content: Content;
  /**
   * The extensions to use
   */
  extensions: Extensions;
  /**
   * Whether to inject base CSS styles
   */
  injectCSS: boolean;
  /**
   * A nonce to use for CSP while injecting styles
   */
  injectNonce: string | undefined;
  /**
   * The editor's initial focus position
   */
  autofocus: FocusPosition;
  /**
   * Whether the editor is editable
   */
  editable: boolean;
  /**
   * The default text direction for all content in the editor.
   * When set to 'ltr' or 'rtl', all nodes will have the corresponding dir attribute.
   * When set to 'auto', the dir attribute will be set based on content detection.
   * When undefined, no dir attribute will be added.
   * @default undefined
   */
  textDirection?: 'ltr' | 'rtl' | 'auto';
  /**
   * The editor's props
   */
  editorProps: EditorProps;
  /**
   * The editor's content parser options
   */
  parseOptions: ParseOptions;
  /**
   * The editor's core extension options
   */
  coreExtensionOptions?: {
    clipboardTextSerializer?: {
      blockSeparator?: string;
    };
    /**
     * Options for the `tabindex` core extension.
     */
    tabindex?: {
      /**
       * The value for the `tabindex` attribute on the editor element.
       */
      value?: string;
    };
    delete?: {
      /**
       * Whether the `delete` extension should be called asynchronously to avoid blocking the editor while processing deletions
       * @default true deletion events are called asynchronously
       */
      async?: boolean;
      /**
       * Allows filtering the transactions that are processed by the `delete` extension.
       * If the function returns `true`, the transaction will be ignored.
       */
      filterTransaction?: (transaction: Transaction) => boolean;
    };
  };
  /**
   * Whether to enable input rules behavior
   */
  enableInputRules: EnableRules;
  /**
   * Whether to enable paste rules behavior
   */
  enablePasteRules: EnableRules;
  /**
   * Determines whether core extensions are enabled.
   *
   * If set to `false`, all core extensions will be disabled.
   * To disable specific core extensions, provide an object where the keys are the extension names and the values are `false`.
   * Extensions not listed in the object will remain enabled.
   *
   * @example
   * // Disable all core extensions
   * enabledCoreExtensions: false
   *
   * @example
   * // Disable only the keymap core extension
   * enabledCoreExtensions: { keymap: false }
   *
   * @default true
   */
  enableCoreExtensions?: boolean | Partial<Record<'editable' | 'clipboardTextSerializer' | 'commands' | 'focusEvents' | 'keymap' | 'tabindex' | 'drop' | 'paste' | 'delete' | 'textDirection', false>>;
  /**
   * If `true`, the editor will check the content for errors on initialization.
   * Emitting the `contentError` event if the content is invalid.
   * Which can be used to show a warning or error message to the user.
   * @default false
   */
  enableContentCheck: boolean;
  /**
   * If `true`, the editor will emit the `contentError` event if invalid content is
   * encountered but `enableContentCheck` is `false`. This lets you preserve the
   * invalid editor content while still showing a warning or error message to
   * the user.
   *
   * @default false
   */
  emitContentError: boolean;
  /**
   * Called before the editor is constructed.
   */
  onBeforeCreate: (props: EditorEvents['beforeCreate']) => void;
  /**
   * Called after the editor is constructed.
   */
  onCreate: (props: EditorEvents['create']) => void;
  /**
   * Called when the editor is mounted.
   */
  onMount: (props: EditorEvents['mount']) => void;
  /**
   * Called when the editor is unmounted.
   */
  onUnmount: (props: EditorEvents['unmount']) => void;
  /**
   * Called when the editor encounters an error while parsing the content.
   * Only enabled if `enableContentCheck` is `true`.
   */
  onContentError: (props: EditorEvents['contentError']) => void;
  /**
   * Called when the editor's content is updated.
   */
  onUpdate: (props: EditorEvents['update']) => void;
  /**
   * Called when the editor's selection is updated.
   */
  onSelectionUpdate: (props: EditorEvents['selectionUpdate']) => void;
  /**
   * Called after a transaction is applied to the editor.
   */
  onTransaction: (props: EditorEvents['transaction']) => void;
  /**
   * Called on focus events.
   */
  onFocus: (props: EditorEvents['focus']) => void;
  /**
   * Called on blur events.
   */
  onBlur: (props: EditorEvents['blur']) => void;
  /**
   * Called when the editor is destroyed.
   */
  onDestroy: (props: EditorEvents['destroy']) => void;
  /**
   * Called when content is pasted into the editor.
   */
  onPaste: (e: ClipboardEvent, slice: Slice) => void;
  /**
   * Called when content is dropped into the editor.
   */
  onDrop: (e: DragEvent, slice: Slice, moved: boolean) => void;
  /**
   * Called when content is deleted from the editor.
   */
  onDelete: (props: EditorEvents['delete']) => void;
  /**
   * Whether to enable extension-level dispatching of transactions.
   * If `false`, extensions cannot define their own `dispatchTransaction` hook.
   *
   * @default true
   * @example
   * new Editor({
   *   enableExtensionDispatchTransaction: false,
   * })
   */
  enableExtensionDispatchTransaction?: boolean;
}
/**
 * The editor's content as HTML
 */
type HTMLContent = string;
/**
 * A Tiptap JSON node or document. Tiptap JSON is the standard format for
 * storing and manipulating Tiptap content. It is equivalent to the JSON
 * representation of a Prosemirror node.
 *
 * Tiptap JSON documents are trees of nodes. The root node is usually of type
 * `doc`. Nodes can have other nodes as children. Nodes can also have marks and
 * attributes. Text nodes (nodes with type `text`) have a `text` property and no
 * children.
 *
 * @example
 * ```ts
 * const content: JSONContent = {
 *   type: 'doc',
 *   content: [
 *     {
 *       type: 'paragraph',
 *       content: [
 *         {
 *           type: 'text',
 *           text: 'Hello ',
 *         },
 *         {
 *           type: 'text',
 *           text: 'world',
 *           marks: [{ type: 'bold' }],
 *         },
 *       ],
 *     },
 *   ],
 * }
 * ```
 */
type JSONContent = {
  /**
   * The type of the node
   */
  type?: string;
  /**
   * The attributes of the node. Attributes can have any JSON-serializable value.
   */
  attrs?: Record<string, any> | undefined;
  /**
   * The children of the node. A node can have other nodes as children.
   */
  content?: JSONContent[];
  /**
   * A list of marks of the node. Inline nodes can have marks.
   */
  marks?: {
    /**
     * The type of the mark
     */
    type: string;
    /**
     * The attributes of the mark. Attributes can have any JSON-serializable value.
     */
    attrs?: Record<string, any>;
    [key: string]: any;
  }[];
  /**
   * The text content of the node. This property is only present on text nodes
   * (i.e. nodes with `type: 'text'`).
   *
   * Text nodes cannot have children, but they can have marks.
   */
  text?: string;
  [key: string]: any;
};
/**
 * A mark type is either a JSON representation of a mark or a Prosemirror mark instance
 */
type MarkType$1<Type extends string | {
  name: string;
} = any, TAttributes extends undefined | Record<string, any> = any> = {
  type: Type;
  attrs: TAttributes;
};
/**
 * A node type is either a JSON representation of a node or a Prosemirror node instance
 */
type NodeType$1<Type extends string | {
  name: string;
} = any, TAttributes extends undefined | Record<string, any> = any, NodeMarkType extends MarkType$1 = any, TContent extends (NodeType$1 | TextType)[] = any> = {
  type: Type;
  attrs: TAttributes;
  content?: TContent;
  marks?: NodeMarkType[];
};
/**
 * A node type is either a JSON representation of a doc node or a Prosemirror doc node instance
 */
type DocumentType<TDocAttributes extends Record<string, any> | undefined = Record<string, any>, TContentType extends NodeType$1[] = NodeType$1[]> = Omit<NodeType$1<'doc', TDocAttributes, never, TContentType>, 'marks' | 'content'> & {
  content: TContentType;
};
/**
 * A node type is either a JSON representation of a text node or a Prosemirror text node instance
 */
type TextType<TMarkType extends MarkType$1 = MarkType$1> = {
  type: 'text';
  text: string;
  marks: TMarkType[];
};
type Content = HTMLContent | JSONContent | JSONContent[] | null;
type CommandProps = {
  editor: Editor$1;
  tr: Transaction;
  commands: SingleCommands;
  can: () => CanCommands;
  chain: () => ChainedCommands;
  state: EditorState;
  view: EditorView;
  dispatch: ((args?: any) => any) | undefined;
};
type Command = (props: CommandProps) => boolean;
type KeyboardShortcutCommand = (props: {
  editor: Editor$1;
}) => boolean;
type Attribute = {
  default?: any;
  validate?: string | ((value: any) => void);
  rendered?: boolean;
  renderHTML?: ((attributes: Record<string, any>) => Record<string, any> | null) | null;
  parseHTML?: ((element: HTMLElement) => any | null) | null;
  keepOnSplit?: boolean;
  isRequired?: boolean;
};
type Attributes = {
  [key: string]: Attribute;
};
type ExtensionAttribute = {
  type: string;
  name: string;
  attribute: Required<Omit<Attribute, 'validate'>> & Pick<Attribute, 'validate'>;
};
type GlobalAttributes = {
  /**
   * The node & mark types this attribute should be applied to.
   * Can be a specific array of type names, or a shorthand string:
   * - `'*'` applies to all nodes (excluding text) and all marks
   * - `'nodes'` applies to all nodes (excluding the built-in text node)
   * - `'marks'` applies to all marks
   * - `string[]` applies to specific node/mark types by name
   * @example
   * types: '*'                                    // All nodes and marks
   * types: 'nodes'                                // All nodes
   * types: 'marks'                                // All marks
   * types: ['heading', 'paragraph']               // Specific types
   */
  types: string[] | 'nodes' | 'marks' | '*';
  /**
   * The attributes to add to the node or mark types.
   */
  attributes: Record<string, Attribute | undefined>;
}[];
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type ValuesOf<T> = T[keyof T];
type KeysWithTypeOf<T, Type> = { [P in keyof T]: T[P] extends Type ? P : never; }[keyof T];
interface NodeViewRendererProps {
  /**
   * The node that is being rendered.
   */
  node: Parameters<NodeViewConstructor>[0];
  /**
   * The editor's view.
   */
  view: Parameters<NodeViewConstructor>[1];
  /**
   * A function that can be called to get the node's current position in the document.
   */
  getPos: Parameters<NodeViewConstructor>[2];
  /**
   * is an array of node or inline decorations that are active around the node.
   * They are automatically drawn in the normal way, and you will usually just want to ignore this, but they can also be used as a way to provide context information to the node view without adding it to the document itself.
   */
  decorations: Parameters<NodeViewConstructor>[3];
  /**
   * holds the decorations for the node's content. You can safely ignore this if your view has no content or a contentDOM property, since the editor will draw the decorations on the content.
   * But if you, for example, want to create a nested editor with the content, it may make sense to provide it with the inner decorations.
   */
  innerDecorations: Parameters<NodeViewConstructor>[4];
  /**
   * The editor instance.
   */
  editor: Editor$1;
  /**
   * The extension that is responsible for the node.
   */
  extension: Node$1;
  /**
   * The HTML attributes that should be added to the node's DOM element.
   */
  HTMLAttributes: Record<string, any>;
}
type NodeViewRenderer = (props: NodeViewRendererProps) => NodeView;
interface MarkViewRendererProps {
  /**
   * The node that is being rendered.
   */
  mark: Parameters<MarkViewConstructor>[0];
  /**
   * The editor's view.
   */
  view: Parameters<MarkViewConstructor>[1];
  /**
   * indicates whether the mark's content is inline
   */
  inline: Parameters<MarkViewConstructor>[2];
  /**
   * The editor instance.
   */
  editor: Editor$1;
  /**
   * The extension that is responsible for the mark.
   */
  extension: Mark$1;
  /**
   * The HTML attributes that should be added to the mark's DOM element.
   */
  HTMLAttributes: Record<string, any>;
  updateAttributes: (attrs: Record<string, any>) => void;
}
type MarkViewRenderer<Props = MarkViewRendererProps> = (props: Props) => MarkView;
type UnionCommands<T = Command> = UnionToIntersection<ValuesOf<Pick<Commands<T>, KeysWithTypeOf<Commands<T>, object>>>>;
type RawCommands = { [Item in keyof UnionCommands]: UnionCommands<Command>[Item]; };
type SingleCommands = { [Item in keyof UnionCommands]: UnionCommands<boolean>[Item]; };
type ChainedCommands = { [Item in keyof UnionCommands]: UnionCommands<ChainedCommands>[Item]; } & {
  run: () => boolean;
};
type CanCommands = SingleCommands & {
  chain: () => ChainedCommands;
};
type FocusPosition = 'start' | 'end' | 'all' | number | boolean | null;
type Range = {
  from: number;
  to: number;
};
type TextSerializer = (props: {
  node: Node;
  pos: number;
  parent: Node;
  index: number;
  range: Range;
}) => string;
type ExtendedRegExpMatchArray = RegExpMatchArray & {
  data?: Record<string, any>;
};
/** Markdown related types */
type MarkdownToken = {
  type?: string;
  raw?: string;
  text?: string;
  tokens?: MarkdownToken[];
  depth?: number;
  items?: MarkdownToken[];
  [key: string]: any;
};
/**
 * Helpers specifically for parsing markdown tokens into Tiptap JSON.
 * These are provided to extension parse handlers.
 */
type MarkdownParseHelpers = {
  /** Parse an array of inline tokens into text nodes with marks */
  parseInline: (tokens: MarkdownToken[]) => JSONContent[];
  /** Tokenize source text as inline markdown when supported by the markdown parser */
  tokenizeInline?: (src: string) => MarkdownToken[];
  /** Parse an array of block-level tokens */
  parseChildren: (tokens: MarkdownToken[]) => JSONContent[];
  /** Parse block-level tokens while preserving implicit empty paragraphs from blank lines */
  parseBlockChildren?: (tokens: MarkdownToken[]) => JSONContent[];
  /** Create a text node with optional marks */
  createTextNode: (text: string, marks?: Array<{
    type: string;
    attrs?: any;
  }>) => JSONContent;
  /** Create any node type with attributes and content */
  createNode: (type: string, attrs?: any, content?: JSONContent[]) => JSONContent;
  /** Apply a mark to content (used for inline marks like bold, italic) */
  applyMark: (markType: string, content: JSONContent[], attrs?: any) => {
    mark: string;
    content: JSONContent[];
    attrs?: any;
  };
};
/**
 * Return shape for parser-level `parse` handlers.
 * - a single JSON-like node
 * - an array of JSON-like nodes
 * - or a `{ mark: string, content: JSONLike[] }` shape to apply a mark
 */
type MarkdownParseResult = JSONContent | JSONContent[] | {
  mark: string;
  content: JSONContent[];
  attrs?: any;
};
type RenderContext = {
  index: number;
  level: number;
  meta?: Record<string, any>;
  parentType?: string | null;
  previousNode?: JSONContent | null;
};
/**
 * Configuration object passed to custom marked.js tokenizers
 */
type MarkdownLexerConfiguration = {
  /**
   * Can be used to transform source text into inline tokens - useful while tokenizing child tokens.
   * @param src
   * @returns Array of inline tokens
   */
  inlineTokens: (src: string) => MarkdownToken[];
  /**
   * Can be used to transform source text into block-level tokens - useful while tokenizing child tokens.
   * @param src
   * @returns Array of block-level tokens
   */
  blockTokens: (src: string) => MarkdownToken[];
};
/** Custom tokenizer function for marked.js extensions */
type MarkdownTokenizer = {
  /** Token name this tokenizer creates */
  name: string;
  /** Priority level for tokenizer ordering (higher = earlier) */
  level?: 'block' | 'inline';
  /** A string to look for or a function that returns the start index of the token in the source string */
  start?: string | ((src: string) => number);
  /** Function that attempts to parse custom syntax from start of text */
  tokenize: (src: string, tokens: MarkdownToken[], lexer: MarkdownLexerConfiguration) => MarkdownToken | undefined | void;
};
type MarkdownRendererHelpers = {
  /**
   * Render children nodes to a markdown string, optionally separated by a string.
   * @param nodes The node or array of nodes to render
   * @param separator An optional separator string (legacy) or RenderContext
   * @returns The rendered markdown string
   */
  renderChildren: (nodes: JSONContent | JSONContent[], separator?: string) => string;
  /** Render a single child node with its sibling index preserved */
  renderChild?: (node: JSONContent, index: number) => string;
  /**
   * Render a text token to a markdown string
   * @param prefix The prefix to add before the content
   * @param content The content to wrap
   * @returns The wrapped content
   */
  wrapInBlock: (prefix: string, content: string) => string;
  /**
   * Indent a markdown string according to the provided RenderContext
   * @param content The content to indent
   * @returns The indented content
   */
  indent: (content: string) => string;
};
type Utils = {
  /**
   * Returns the new position after applying a transaction.
   *
   * @param position The position to update. A MappablePosition instance.
   * @param transaction The transaction to apply.
   * @returns The new position after applying the transaction.
   *
   * @example
   * const position = editor.utils.createMappablePosition(10)
   * const {position, mapResult} = editor.utils.getUpdatedPosition(position, transaction)
   */
  getUpdatedPosition: (position: MappablePosition, transaction: Transaction) => GetUpdatedPositionResult;
  /**
   * Creates a MappablePosition from a position number. A mappable position can be used to track the
   * next position after applying a transaction.
   *
   * @param position The position (as a number) where the MappablePosition will be created.
   * @returns A new MappablePosition instance at the given position.
   *
   * @example
   * const position = editor.utils.createMappablePosition(10)
   */
  createMappablePosition: (position: number) => MappablePosition;
};
interface Commands<ReturnType = any> {}
interface Storage {}
//#endregion
//#region ../core/src/helpers/flattenExtensions.d.ts
/**
 * Create a flattened array of extensions by traversing the `addExtensions` field.
 * @param extensions An array of Tiptap extensions
 * @returns A flattened array of Tiptap extensions
 */
declare function flattenExtensions(extensions: Extensions): Extensions;
//#endregion
//#region ../core/src/helpers/resolveExtensions.d.ts
/**
 * Returns a flattened and sorted extension list while
 * also checking for duplicated extensions and warns the user.
 * @param extensions An array of Tiptap extensions
 * @returns An flattened and sorted array of Tiptap extensions
 */
declare function resolveExtensions(extensions: Extensions): Extensions;
//#endregion
//#region ../core/src/helpers/sortExtensions.d.ts
/**
 * Sort extensions by priority.
 * @param extensions An array of Tiptap extensions
 * @returns A sorted array of Tiptap extensions by priority
 */
declare function sortExtensions(extensions: Extensions): Extensions;
//#endregion
//#region ../core/src/ExtensionManager.d.ts
declare class ExtensionManager {
  editor: Editor$1;
  schema: Schema;
  /**
   * A flattened and sorted array of all extensions
   */
  extensions: Extensions;
  /**
   * A non-flattened array of base extensions (no sub-extensions)
   */
  baseExtensions: Extensions;
  splittableMarks: string[];
  nonClearableMarks: string[];
  decorationManager: DecorationManager | null;
  constructor(extensions: Extensions, editor: Editor$1);
  static resolve: typeof resolveExtensions;
  static sort: typeof sortExtensions;
  static flatten: typeof flattenExtensions;
  /**
   * Get all commands from the extensions.
   * @returns An object with all commands where the key is the command name and the value is the command function
   */
  get commands(): RawCommands;
  /**
   * Get all registered Prosemirror plugins from the extensions.
   * @returns An array of Prosemirror plugins
   */
  get plugins(): Plugin[];
  /**
   * Aggregates decorations from extensions into a single plugin, or returns null
   * if none exist. Destroys the previous manager to avoid orphaned listeners.
   * @returns A ProseMirror plugin or `null`
   * @example
   * const plugin = editor.extensionManager.createDecorationPlugin()
   */
  createDecorationPlugin(): Plugin | null;
  /**
   * Get all attributes from the extensions.
   * @returns An array of attributes
   */
  get attributes(): ExtensionAttribute[];
  /**
   * Get all node views from the extensions.
   * @returns An object with all node views where the key is the node name and the value is the node view function
   */
  get nodeViews(): Record<string, NodeViewConstructor>;
  /**
   * Get the composed dispatchTransaction function from all extensions.
   * @param baseDispatch The base dispatch function (e.g. from the editor or user props)
   * @returns A composed dispatch function
   */
  dispatchTransaction(baseDispatch: (tr: Transaction) => void): (tr: Transaction) => void;
  /**
   * Get the composed transformPastedHTML function from all extensions.
   * @param baseTransform The base transform function (e.g. from the editor props)
   * @returns A composed transform function that chains all extension transforms
   */
  transformPastedHTML(baseTransform?: (html: string, view?: any) => string): (html: string, view?: EditorView) => string;
  get markViews(): Record<string, MarkViewConstructor>;
  /**
   * Destroy the extension manager and clean up all extension references
   * to prevent memory leaks through parent/child extension chains.
   *
   * Walks each extension's full parent chain and nulls every forward
   * `parent.child → current` link where the parent still points to the
   * current node. This breaks the retention path from module-scope
   * singleton roots through deep extend() chains.
   *
   * Only ancestor `.child` links matching the current chain are cleared.
   * The `.parent` pointer on ancestors is never touched — extensions
   * may be shared across live editors, so their own backward references
   * and non-matching forward links must remain intact.
   */
  destroy(): void;
  /**
   * Go through all extensions, create extension storages & setup marks
   * & bind editor event listener.
   */
  private setupExtensions;
}
//#endregion
//#region ../core/src/NodePos.d.ts
declare class NodePos {
  private resolvedPos;
  private isBlock;
  private editor;
  private get name();
  constructor(pos: ResolvedPos, editor: Editor$1, isBlock?: boolean, node?: Node | null);
  private currentNode;
  get node(): Node;
  get element(): HTMLElement;
  actualDepth: number | null;
  get depth(): number;
  get pos(): number;
  get content(): Fragment;
  set content(content: Content);
  get attributes(): {
    [key: string]: any;
  };
  get textContent(): string;
  get size(): number;
  get from(): number;
  get range(): Range;
  get to(): number;
  get parent(): NodePos | null;
  get before(): NodePos | null;
  get after(): NodePos | null;
  get children(): NodePos[];
  get firstChild(): NodePos | null;
  get lastChild(): NodePos | null;
  closest(selector: string, attributes?: {
    [key: string]: any;
  }): NodePos | null;
  querySelector(selector: string, attributes?: {
    [key: string]: any;
  }): NodePos | null;
  querySelectorAll(selector: string, attributes?: {
    [key: string]: any;
  }, firstItemOnly?: boolean): NodePos[];
  setAttribute(attributes: {
    [key: string]: any;
  }): void;
}
//#endregion
//#region ../core/src/commands/blur.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blur: {
      /**
       * Removes focus from the editor.
       * @example editor.commands.blur()
       */
      blur: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/clearContent.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clearContent: {
      /**
       * Clear the whole document.
       * @example editor.commands.clearContent()
       */
      clearContent: (
      /**
       * Whether to emit an update event.
       * @default true
       */
      emitUpdate?: boolean) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/clearNodes.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clearNodes: {
      /**
       * Normalize nodes to a simple paragraph.
       * @example editor.commands.clearNodes()
       */
      clearNodes: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/command.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    command: {
      /**
       * Define a command inline.
       * @param fn The command function.
       * @example
       * editor.commands.command(({ tr, state }) => {
       *   ...
       *   return true
       * })
       */
      command: (fn: (props: Parameters<Command>[0]) => boolean) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/createParagraphNear.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    createParagraphNear: {
      /**
       * Create a paragraph nearby.
       * @example editor.commands.createParagraphNear()
       */
      createParagraphNear: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/cut.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cut: {
      /**
       * Cuts content from a range and inserts it at a given position.
       * @param range The range to cut.
       * @param range.from The start position of the range.
       * @param range.to The end position of the range.
       * @param targetPos The position to insert the content at.
       * @example editor.commands.cut({ from: 1, to: 3 }, 5)
       */
      cut: ({ from, to }: {
        from: number;
        to: number;
      }, targetPos: number) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/deleteCurrentNode.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    deleteCurrentNode: {
      /**
       * Delete the node that currently has the selection anchor.
       * @example editor.commands.deleteCurrentNode()
       */
      deleteCurrentNode: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/deleteNode.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    deleteNode: {
      /**
       * Delete a node with a given type or name.
       * @param typeOrName The type or name of the node.
       * @example editor.commands.deleteNode('paragraph')
       */
      deleteNode: (typeOrName: string | NodeType) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/deleteRange.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    deleteRange: {
      /**
       * Delete a given range.
       * @param range The range to delete.
       * @example editor.commands.deleteRange({ from: 1, to: 3 })
       */
      deleteRange: (range: Range) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/deleteSelection.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    deleteSelection: {
      /**
       * Delete the selection, if there is one.
       * @example editor.commands.deleteSelection()
       */
      deleteSelection: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/enter.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    enter: {
      /**
       * Trigger enter.
       * @example editor.commands.enter()
       */
      enter: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/exitCode.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    exitCode: {
      /**
       * Exit from a code block.
       * @example editor.commands.exitCode()
       */
      exitCode: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/extendMarkRange.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    extendMarkRange: {
      /**
       * Extends the text selection to the current mark by type or name.
       * @param typeOrName The type or name of the mark.
       * @param attributes The attributes to match against.
       * If not provided, only the first mark at the position will be matched.
       * @example editor.commands.extendMarkRange('bold')
       * @example editor.commands.extendMarkRange('mention', { userId: "1" })
       */
      extendMarkRange: (
      /**
       * The type or name of the mark.
       */
      typeOrName: string | MarkType,
      /**
       * The attributes of the mark.
       */
      attributes?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/first.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    first: {
      /**
       * Runs one command after the other and stops at the first which returns true.
       * @param commands The commands to run.
       * @example editor.commands.first([command1, command2])
       */
      first: (commands: Command[] | ((props: CommandProps) => Command[])) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/focus.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    focus: {
      /**
       * Focus the editor at the given position.
       * @param position The position to focus at.
       * @param options.scrollIntoView Scroll the focused position into view after focusing
       * @example editor.commands.focus()
       * @example editor.commands.focus(32, { scrollIntoView: false })
       */
      focus: (
      /**
       * The position to focus at.
       */
      position?: FocusPosition,
      /**
       * Optional options
       * @default { scrollIntoView: true }
       */
      options?: {
        scrollIntoView?: boolean;
      }) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/forEach.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    forEach: {
      /**
       * Loop through an array of items.
       */
      forEach: <T>(items: T[], fn: (item: T, props: CommandProps & {
        index: number;
      }) => boolean) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/insertContent.d.ts
interface InsertContentOptions {
  /**
   * Options for parsing the content.
   */
  parseOptions?: ParseOptions;
  /**
   * Whether to update the selection after inserting the content.
   */
  updateSelection?: boolean;
  applyInputRules?: boolean;
  applyPasteRules?: boolean;
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertContent: {
      /**
       * Insert a node or string of HTML at the current position.
       * @example editor.commands.insertContent('<h1>Example</h1>')
       * @example editor.commands.insertContent('<h1>Example</h1>', { updateSelection: false })
       */
      insertContent: (
      /**
       * The ProseMirror content to insert.
       */
      value: Content | Node | Fragment,
      /**
       * Optional options
       */
      options?: InsertContentOptions) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/insertContentAt.d.ts
interface InsertContentAtOptions {
  /**
   * Options for parsing the content.
   */
  parseOptions?: ParseOptions;
  /**
   * Whether to update the selection after inserting the content.
   */
  updateSelection?: boolean;
  /**
   * Whether to apply input rules after inserting the content.
   */
  applyInputRules?: boolean;
  /**
   * Whether to apply paste rules after inserting the content.
   */
  applyPasteRules?: boolean;
  /**
   * Whether to throw an error if the content is invalid.
   */
  errorOnInvalidContent?: boolean;
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertContentAt: {
      /**
       * Insert a node or string of HTML at a specific position.
       * @example editor.commands.insertContentAt(0, '<h1>Example</h1>')
       */
      insertContentAt: (
      /**
       * The position to insert the content at.
       */
      position: number | Range,
      /**
       * The ProseMirror content to insert.
       */
      value: Content | Node | Fragment,
      /**
       * Optional options
       */
      options?: InsertContentAtOptions) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/insertDefaultBlock.d.ts
interface InsertDefaultBlockOptions {
  /**
   * The position to insert the block at.
   * Accepts a number or a resolved ProseMirror position.
   * Defaults to the current caret position.
   */
  pos?: number | ResolvedPos;
  /**
   * Attributes to apply to the inserted node.
   * Only attributes that match the node's schema will be applied.
   */
  attrs?: Record<string, any>;
  /**
   * Content to insert into the block.
   * Accepts string (plain text or HTML), ProseMirror node, or Fragment.
   */
  content?: Content | Node | Fragment;
  /**
   * Whether to update the selection after inserting the content.
   * @default true
   */
  updateSelection?: boolean;
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertDefaultBlock: {
      /**
       * Insert a default content block at the given position.
       * Returns false when the default block can't be inserted at that position.
       * @example editor.commands.insertDefaultBlock()
       * @example editor.commands.insertDefaultBlock({ pos: 5, content: 'Hello' })
       */
      insertDefaultBlock: (options?: InsertDefaultBlockOptions) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/join.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    joinUp: {
      /**
       * Join the selected block or, if there is a text selection, the closest ancestor block of the selection that can be joined, with the sibling above it.
       * @example editor.commands.joinUp()
       */
      joinUp: () => ReturnType;
    };
    joinDown: {
      /**
       * Join the selected block, or the closest ancestor of the selection that can be joined, with the sibling after it.
       * @example editor.commands.joinDown()
       */
      joinDown: () => ReturnType;
    };
    joinBackward: {
      /**
       * If the selection is empty and at the start of a textblock, try to reduce the distance between that block and the one before it—if there's a block directly before it that can be joined, join them.
       * If not, try to move the selected block closer to the next one in the document structure by lifting it out of its
       * parent or moving it into a parent of the previous block. Will use the view for accurate (bidi-aware) start-of-textblock detection if given.
       * @example editor.commands.joinBackward()
       */
      joinBackward: () => ReturnType;
    };
    joinForward: {
      /**
       * If the selection is empty and the cursor is at the end of a textblock, try to reduce or remove the boundary between that block and the one after it,
       * either by joining them or by moving the other block closer to this one in the tree structure.
       * Will use the view for accurate start-of-textblock detection if given.
       * @example editor.commands.joinForward()
       */
      joinForward: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/joinItemBackward.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    joinItemBackward: {
      /**
       * Join two items backward.
       * @example editor.commands.joinItemBackward()
       */
      joinItemBackward: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/joinItemForward.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    joinItemForward: {
      /**
       * Join two items Forwards.
       * @example editor.commands.joinItemForward()
       */
      joinItemForward: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/joinTextblockBackward.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    joinTextblockBackward: {
      /**
       * A more limited form of joinBackward that only tries to join the current textblock to the one before it, if the cursor is at the start of a textblock.
       */
      joinTextblockBackward: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/joinTextblockForward.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    joinTextblockForward: {
      /**
       * A more limited form of joinForward that only tries to join the current textblock to the one after it, if the cursor is at the end of a textblock.
       */
      joinTextblockForward: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/keyboardShortcut.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    keyboardShortcut: {
      /**
       * Trigger a keyboard shortcut.
       * @param name The name of the keyboard shortcut.
       * @example editor.commands.keyboardShortcut('Mod-b')
       */
      keyboardShortcut: (name: string) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/lift.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lift: {
      /**
       * Removes an existing wrap if possible lifting the node out of it
       * @param typeOrName The type or name of the node.
       * @param attributes The attributes of the node.
       * @example editor.commands.lift('paragraph')
       * @example editor.commands.lift('heading', { level: 1 })
       */
      lift: (typeOrName: string | NodeType, attributes?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/liftEmptyBlock.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    liftEmptyBlock: {
      /**
       * If the cursor is in an empty textblock that can be lifted, lift the block.
       * @example editor.commands.liftEmptyBlock()
       */
      liftEmptyBlock: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/liftListItem.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    liftListItem: {
      /**
       * Create a command to lift the list item around the selection up into a wrapping list.
       * @param typeOrName The type or name of the node.
       * @example editor.commands.liftListItem('listItem')
       */
      liftListItem: (typeOrName: string | NodeType) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/newlineInCode.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    newlineInCode: {
      /**
       * Add a newline character in code.
       * @example editor.commands.newlineInCode()
       */
      newlineInCode: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/resetAttributes.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resetAttributes: {
      /**
       * Resets some node attributes to the default value.
       * @param typeOrName The type or name of the node.
       * @param attributes The attributes of the node to reset.
       * @example editor.commands.resetAttributes('heading', 'level')
       */
      resetAttributes: (typeOrName: string | NodeType | MarkType, attributes: string | string[]) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/scrollIntoView.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    scrollIntoView: {
      /**
       * Scroll the selection into view.
       * @example editor.commands.scrollIntoView()
       */
      scrollIntoView: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/selectAll.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectAll: {
      /**
       * Select the whole document.
       * @example editor.commands.selectAll()
       */
      selectAll: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/selectNodeBackward.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectNodeBackward: {
      /**
       * Select a node backward.
       * @example editor.commands.selectNodeBackward()
       */
      selectNodeBackward: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/selectNodeForward.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectNodeForward: {
      /**
       * Select a node forward.
       * @example editor.commands.selectNodeForward()
       */
      selectNodeForward: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/selectParentNode.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectParentNode: {
      /**
       * Select the parent node.
       * @example editor.commands.selectParentNode()
       */
      selectParentNode: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/selectTextblockEnd.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectTextblockEnd: {
      /**
       * Moves the cursor to the end of current text block.
       * @example editor.commands.selectTextblockEnd()
       */
      selectTextblockEnd: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/selectTextblockStart.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectTextblockStart: {
      /**
       * Moves the cursor to the start of current text block.
       * @example editor.commands.selectTextblockStart()
       */
      selectTextblockStart: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/setContent.d.ts
interface SetContentOptions {
  /**
   * Options for parsing the content.
   * @default {}
   */
  parseOptions?: ParseOptions;
  /**
   * Whether to throw an error if the content is invalid.
   */
  errorOnInvalidContent?: boolean;
  /**
   * Whether to emit an update event.
   * @default true
   */
  emitUpdate?: boolean;
}
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setContent: {
      /**
       * Replace the whole document with new content.
       * @param content The new content.
       * @param emitUpdate Whether to emit an update event.
       * @param parseOptions Options for parsing the content.
       * @example editor.commands.setContent('<p>Example text</p>')
       */
      setContent: (
      /**
       * The new content.
       */
      content: Content | Fragment | Node,
      /**
       * Options for `setContent`.
       */
      options?: SetContentOptions) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/setMark.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setMark: {
      /**
       * Add a mark with new attributes.
       * @param typeOrName The mark type or name.
       * @example editor.commands.setMark('bold', { level: 1 })
       */
      setMark: (typeOrName: string | MarkType, attributes?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/setMeta.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setMeta: {
      /**
       * Store a metadata property in the current transaction.
       * @param key The key of the metadata property.
       * @param value The value to store.
       * @example editor.commands.setMeta('foo', 'bar')
       */
      setMeta: (key: string | Plugin | PluginKey, value: any) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/setNode.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setNode: {
      /**
       * Replace a given range with a node.
       * @param typeOrName The type or name of the node
       * @param attributes The attributes of the node
       * @example editor.commands.setNode('paragraph')
       */
      setNode: (typeOrName: string | NodeType, attributes?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/setNodeSelection.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setNodeSelection: {
      /**
       * Creates a NodeSelection.
       * @param position - Position of the node.
       * @example editor.commands.setNodeSelection(10)
       */
      setNodeSelection: (position: number) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/setTextDirection.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setTextDirection: {
      /**
       * Set the text direction for nodes.
       * If no position is provided, it will use the current selection.
       * @param direction The text direction to set ('ltr', 'rtl', or 'auto')
       * @param position Optional position or range to apply the direction to
       * @example editor.commands.setTextDirection('rtl')
       * @example editor.commands.setTextDirection('ltr', { from: 0, to: 10 })
       */
      setTextDirection: (direction: 'ltr' | 'rtl' | 'auto', position?: number | Range) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/setTextSelection.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setTextSelection: {
      /**
       * Creates a TextSelection.
       * @param position The position of the selection.
       * @example editor.commands.setTextSelection(10)
       */
      setTextSelection: (position: number | Range) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/sinkListItem.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sinkListItem: {
      /**
       * Sink the list item down into an inner list.
       * @param typeOrName The type or name of the node.
       * @example editor.commands.sinkListItem('listItem')
       */
      sinkListItem: (typeOrName: string | NodeType) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/splitBlock.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    splitBlock: {
      /**
       * Forks a new node from an existing node.
       * @param options.keepMarks Keep marks from the previous node.
       * @example editor.commands.splitBlock()
       * @example editor.commands.splitBlock({ keepMarks: true })
       */
      splitBlock: (options?: {
        keepMarks?: boolean;
      }) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/splitListItem.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    splitListItem: {
      /**
       * Splits one list item into two list items.
       * @param typeOrName The type or name of the node.
       * @param overrideAttrs The attributes to ensure on the new node.
       * @example editor.commands.splitListItem('listItem')
       */
      splitListItem: (typeOrName: string | NodeType, overrideAttrs?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/toggleList.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleList: {
      /**
       * Toggle between different list types.
       * @param listTypeOrName The type or name of the list.
       * @param itemTypeOrName The type or name of the list item.
       * @param keepMarks Keep marks when toggling.
       * @param attributes Attributes for the new list.
       * @example editor.commands.toggleList('bulletList', 'listItem')
       */
      toggleList: (listTypeOrName: string | NodeType, itemTypeOrName: string | NodeType, keepMarks?: boolean, attributes?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/toggleMark.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleMark: {
      /**
       * Toggle a mark on and off.
       * @param typeOrName The mark type or name.
       * @param attributes The attributes of the mark.
       * @param options.extendEmptyMarkRange Removes the mark even across the current selection. Defaults to `false`.
       * @example editor.commands.toggleMark('bold')
       */
      toggleMark: (
      /**
       * The mark type or name.
       */
      typeOrName: string | MarkType,
      /**
       * The attributes of the mark.
       */
      attributes?: Record<string, any>, options?: {
        /**
         * Removes the mark even across the current selection. Defaults to `false`.
         */
        extendEmptyMarkRange?: boolean;
      }) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/toggleNode.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleNode: {
      /**
       * Toggle a node with another node.
       * @param typeOrName The type or name of the node.
       * @param toggleTypeOrName The type or name of the node to toggle.
       * @param attributes The attributes of the node.
       * @example editor.commands.toggleNode('heading', 'paragraph')
       */
      toggleNode: (typeOrName: string | NodeType, toggleTypeOrName: string | NodeType, attributes?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/toggleWrap.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleWrap: {
      /**
       * Wraps nodes in another node, or removes an existing wrap.
       * @param typeOrName The type or name of the node.
       * @param attributes The attributes of the node.
       * @example editor.commands.toggleWrap('blockquote')
       */
      toggleWrap: (typeOrName: string | NodeType, attributes?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/undoInputRule.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    undoInputRule: {
      /**
       * Undo an input rule.
       * @example editor.commands.undoInputRule()
       */
      undoInputRule: () => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/unsetAllMarks.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    unsetAllMarks: {
      /**
       * Remove all clearable marks in the current selection.
       * Marks with `clearable: false` are preserved
       * @param options.ignoreClearable If true, removes all marks regardless of `clearable` setting. Defaults to `false`.
       * @example editor.commands.unsetAllMarks()
       * @example editor.commands.unsetAllMarks({ ignoreClearable: true })
       */
      unsetAllMarks: (options?: {
        ignoreClearable?: boolean;
      }) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/unsetMark.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    unsetMark: {
      /**
       * Remove all marks in the current selection.
       * @param typeOrName The mark type or name.
       * @param options.extendEmptyMarkRange Removes the mark even across the current selection. Defaults to `false`.
       * @example editor.commands.unsetMark('bold')
       */
      unsetMark: (
      /**
       * The mark type or name.
       */
      typeOrName: string | MarkType, options?: {
        /**
         * Removes the mark even across the current selection. Defaults to `false`.
         */
        extendEmptyMarkRange?: boolean;
      }) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/unsetTextDirection.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    unsetTextDirection: {
      /**
       * Remove the text direction attribute from nodes.
       * If no position is provided, it will use the current selection.
       * @param position Optional position or range to remove the direction from
       * @example editor.commands.unsetTextDirection()
       * @example editor.commands.unsetTextDirection({ from: 0, to: 10 })
       */
      unsetTextDirection: (position?: number | Range) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/updateAttributes.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    updateAttributes: {
      /**
       * Update attributes of a node or mark.
       * @param typeOrName The type or name of the node or mark.
       * @param attributes The attributes of the node or mark.
       * @example editor.commands.updateAttributes('mention', { userId: "2" })
       */
      updateAttributes: (
      /**
       * The type or name of the node or mark.
       */
      typeOrName: string | NodeType | MarkType,
      /**
       * The attributes of the node or mark.
       */
      attributes: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/updateDecorations.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    updateDecorations: {
      /**
       * Force declarative decorations to recompute, bypassing each extension's
       * `shouldUpdate` gate. Pass an extension name to recompute only that
       * extension's decorations, or omit it to recompute all of them.
       * @param extensionName The name of the extension to recompute (optional).
       * @example editor.commands.updateDecorations()
       * @example editor.commands.updateDecorations('myExtension')
       */
      updateDecorations: (extensionName?: string) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/wrapIn.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wrapIn: {
      /**
       * Wraps nodes in another node.
       * @param typeOrName The type or name of the node.
       * @param attributes The attributes of the node.
       * @example editor.commands.wrapIn('blockquote')
       */
      wrapIn: (typeOrName: string | NodeType, attributes?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/commands/wrapInList.d.ts
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wrapInList: {
      /**
       * Wrap a node in a list.
       * @param typeOrName The type or name of the node.
       * @param attributes The attributes of the node.
       * @example editor.commands.wrapInList('bulletList')
       */
      wrapInList: (typeOrName: string | NodeType, attributes?: Record<string, any>) => ReturnType;
    };
  }
}
//#endregion
//#region ../core/src/Editor.d.ts
declare class Editor$1 extends EventEmitter<EditorEvents> {
  private commandManager;
  extensionManager: ExtensionManager;
  private css;
  private className;
  schema: Schema;
  private editorView;
  isFocused: boolean;
  private destroyed;
  private editorState;
  /**
   * The editor is considered initialized after the `create` event has been emitted.
   */
  isInitialized: boolean;
  extensionStorage: Storage;
  /**
   * A unique ID for this editor instance.
   */
  instanceId: string;
  private hasWarnedStaleDecorationRead;
  options: EditorOptions;
  constructor(options?: Partial<EditorOptions>);
  /**
   * Attach the editor to the DOM, creating a new editor view.
   */
  mount(el: NonNullable<EditorOptions['element']> & {}): void;
  /**
   * Remove the editor from the DOM, but still allow remounting at a different point in time
   */
  unmount(): void;
  /**
   * Returns the editor storage.
   */
  get storage(): Storage;
  /**
   * An object of all registered commands.
   */
  get commands(): SingleCommands;
  /**
   * Create a command chain to call multiple commands at once.
   */
  chain(): ChainedCommands;
  /**
   * Check if a command or a command chain can be executed. Without executing it.
   */
  can(): CanCommands;
  /**
   * Inject CSS styles.
   */
  private injectCSS;
  /**
   * Update editor options.
   *
   * @param options A list of options
   */
  setOptions(options?: Partial<EditorOptions>): void;
  /**
   * Update editable state of the editor.
   */
  setEditable(editable: boolean, emitUpdate?: boolean): void;
  /**
   * Returns whether the editor is editable.
   */
  get isEditable(): boolean;
  /**
   * Returns the editor view.
   */
  get view(): EditorView;
  /**
   * Returns the editor state.
   */
  get state(): EditorState;
  /**
   * Register a ProseMirror plugin.
   *
   * @param plugin A ProseMirror plugin
   * @param handlePlugins Control how to merge the plugin into the existing plugins.
   * @returns The new editor state
   */
  registerPlugin(plugin: Plugin, handlePlugins?: (newPlugin: Plugin, plugins: Plugin[]) => Plugin[]): EditorState;
  /**
   * Unregister a ProseMirror plugin.
   *
   * @param nameOrPluginKeyToRemove The plugins name
   * @returns The new editor state or undefined if the editor is destroyed
   */
  unregisterPlugin(nameOrPluginKeyToRemove: string | PluginKey | (string | PluginKey)[]): EditorState | undefined;
  /**
   * Creates an extension manager.
   */
  private createExtensionManager;
  /**
   * Creates an command manager.
   */
  private createCommandManager;
  /**
   * Creates a ProseMirror schema.
   */
  private createSchema;
  /**
   * Creates the initial document.
   */
  private createDoc;
  /**
   * Creates a ProseMirror view.
   */
  private createView;
  /**
   * Creates all node and mark views.
   */
  createNodeViews(): void;
  /**
   * Prepend class name to element.
   */
  prependClass(): void;
  isCapturingTransaction: boolean;
  private capturedTransaction;
  captureTransaction(fn: () => void): Transaction | null;
  /**
   * The callback over which to send transactions (state updates) produced by the view.
   *
   * @param transaction An editor state transaction
   */
  private dispatchTransaction;
  /**
   * Get attributes of the currently selected node or mark.
   */
  getAttributes(nameOrType: string | NodeType | MarkType): Record<string, any>;
  /**
   * Returns if the currently selected node or mark is active.
   *
   * @param name Name of the node or mark
   * @param attributes Attributes of the node or mark
   */
  isActive(name: string, attributes?: {}): boolean;
  isActive(attributes: {}): boolean;
  /**
   * Get the document as JSON.
   */
  getJSON(): DocumentType<Record<string, any> | undefined, NodeType$1<string, undefined | Record<string, any>, any, (NodeType$1 | TextType)[]>[]>;
  /**
   * Get the document as HTML.
   */
  getHTML(): string;
  /**
   * Get the document as text.
   */
  getText(options?: {
    blockSeparator?: string;
    textSerializers?: Record<string, TextSerializer>;
  }): string;
  /**
   * Check if there is no content.
   */
  get isEmpty(): boolean;
  /**
   * Destroy the editor.
   */
  destroy(): void;
  /**
   * Check if the editor is already destroyed.
   */
  get isDestroyed(): boolean;
  $node(selector: string, attributes?: {
    [key: string]: any;
  }): NodePos | null;
  $nodes(selector: string, attributes?: {
    [key: string]: any;
  }): NodePos[] | null;
  $pos(pos: number): NodePos;
  get $doc(): NodePos;
  /**
   * Returns a set of utilities for working with positions and ranges.
   */
  utils: Utils;
}
//#endregion
//#region src/DragHandle.d.ts
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
type DragHandleProps = Omit<Optional<DragHandlePluginProps, 'pluginKey' | 'nestedOptions'>, 'element'> & {
  class?: string;
  onNodeChange?: (data: {
    node: Node | null;
    editor: Editor;
    pos: number;
  }) => void;
  /**
   * Enable drag handles for nested content (list items, blockquotes, etc.).
   *
   * When enabled, the drag handle will appear for nested blocks, not just
   * top-level blocks. A rule-based scoring system determines which node
   * to target based on cursor position and configured rules.
   *
   * @default false
   */
  nested?: boolean | NestedOptions;
};
declare const DragHandle: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  pluginKey: {
    type: PropType<PluginKey | string>;
    default: PluginKey<any>;
  };
  editor: {
    type: PropType<DragHandleProps["editor"]>;
    required: true;
  };
  computePositionConfig: {
    type: PropType<DragHandleProps["computePositionConfig"]>;
    default: () => {};
  };
  onNodeChange: {
    type: PropType<DragHandleProps["onNodeChange"]>;
    default: null;
  };
  onElementDragStart: {
    type: PropType<DragHandleProps["onElementDragStart"]>;
    default: null;
  };
  onElementDragEnd: {
    type: PropType<DragHandleProps["onElementDragEnd"]>;
    default: null;
  };
  class: {
    type: PropType<DragHandleProps["class"]>;
    default: string;
  };
  nested: {
    type: PropType<DragHandleProps["nested"]>;
    default: boolean;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  pluginKey: {
    type: PropType<PluginKey | string>;
    default: PluginKey<any>;
  };
  editor: {
    type: PropType<DragHandleProps["editor"]>;
    required: true;
  };
  computePositionConfig: {
    type: PropType<DragHandleProps["computePositionConfig"]>;
    default: () => {};
  };
  onNodeChange: {
    type: PropType<DragHandleProps["onNodeChange"]>;
    default: null;
  };
  onElementDragStart: {
    type: PropType<DragHandleProps["onElementDragStart"]>;
    default: null;
  };
  onElementDragEnd: {
    type: PropType<DragHandleProps["onElementDragEnd"]>;
    default: null;
  };
  class: {
    type: PropType<DragHandleProps["class"]>;
    default: string;
  };
  nested: {
    type: PropType<DragHandleProps["nested"]>;
    default: boolean;
  };
}>> & Readonly<{}>, {
  pluginKey: string | PluginKey<any>;
  onNodeChange: (((data: {
    editor: Editor$1;
    node: Node | null;
    pos: number;
  }) => void) & ((data: {
    node: Node | null;
    editor: Editor;
    pos: number;
  }) => void)) | undefined;
  onElementDragStart: ((e: DragEvent) => void) | undefined;
  onElementDragEnd: ((e: DragEvent) => void) | undefined;
  computePositionConfig: {
    placement?: import("@floating-ui/dom").Placement | undefined;
    strategy?: import("@floating-ui/dom").Strategy | undefined;
    middleware?: (false | {
      name: string;
      options?: any;
      fn: (state: import("@floating-ui/dom").MiddlewareState) => import("@floating-ui/dom").MiddlewareReturn | Promise<import("@floating-ui/dom").MiddlewareReturn>;
    } | null | undefined)[] | undefined;
    platform?: import("@floating-ui/dom").Platform | undefined;
  } | undefined;
  class: string | undefined;
  nested: boolean | NestedOptions | undefined;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//#endregion
export { DragHandle, DragHandle as default, DragHandleProps };
//# sourceMappingURL=index.d.cts.map