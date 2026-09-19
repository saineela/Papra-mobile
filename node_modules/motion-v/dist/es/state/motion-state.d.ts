import { MotionStateContext, Options } from '../types';
import { DOMKeyframesDefinition, VisualElement, VisualElementOptions } from 'motion-dom';
import { Feature, FeatureKey, StateType } from '../features';
import { PresenceContext } from '../components/animate-presence/presence';
export declare const mountedStates: WeakMap<Element, MotionState>;
export type VisualElementRenderer = (tag: string, options: VisualElementOptions<any, any>) => VisualElement<Element>;
/**
 * The render + feature bundle a motion instance runs with — from the
 * component's own feature bundle or resolved asynchronously by LazyMotion.
 */
export interface MotionBundle {
    renderer?: VisualElementRenderer;
    features?: Array<typeof Feature>;
}
/**
 * Core class that manages animation state and orchestrates animations.
 * Handles component lifecycle methods in the correct order based on component tree position.
 */
export declare class MotionState {
    type: 'html' | 'svg';
    element: HTMLElement | SVGElement | null;
    parent?: MotionState;
    isExiting: boolean;
    options: Options & {
        presenceContext?: PresenceContext;
    };
    private children?;
    latestValues: DOMKeyframesDefinition;
    private features;
    private featureCtors;
    visualElement: VisualElement<Element>;
    constructor(options: Options, parent?: MotionState, bundle?: MotionBundle);
    private _context;
    get context(): MotionStateContext;
    /**
     * Declare (or asynchronously resolve, e.g. LazyMotion) the render + feature
     * bundle for this state, then sync — the visual element and feature
     * instances are created lazily inside updateFeatures().
     */
    setBundle(bundle: MotionBundle): void;
    /**
     * Instantiate any missing features, then mount unmounted ones and update
     * the rest. Feature constructors dereference the visual element, so this
     * no-ops until setBundle() has created one. Feature mount is isMount-guarded,
     * so this is safe to call repeatedly and from any lifecycle stage.
     */
    updateFeatures(): void;
    updateOptions(options: Options): void;
    mount(element: HTMLElement | SVGElement): void;
    beforeUnmount(): void;
    unmount(): void;
    beforeUpdate(): void;
    update(): void;
    /** Access an installed feature by key, e.g. getFeature<ExitFeature>('exit') */
    getFeature<T extends Feature>(key: FeatureKey): T | undefined;
    setActive(name: StateType, isActive: boolean): void;
    isMounted(): boolean;
    /**
     * Create and attach the visual element using the given renderer.
     * Called by setBundle(); no-ops once created.
     */
    private initVisualElement;
    getSnapshot(isPresent: boolean): void;
    didUpdate(): void;
}
