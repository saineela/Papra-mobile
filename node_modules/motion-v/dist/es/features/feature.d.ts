import { MotionState } from '../state/motion-state';
export type FeatureKey = 'animation' | 'projection' | 'layout' | 'exit' | 'hover' | 'press' | 'focus' | 'drag' | 'pan' | 'inView';
export declare class Feature {
    static key: FeatureKey;
    /**
     * Managed by MotionState — set after mount(), reset after unmount(),
     * so a MotionState remount (KeepAlive, directive reuse) re-runs mount().
     */
    isMount: boolean;
    state: MotionState;
    constructor(state: MotionState);
    mount(): void;
    beforeUnmount(): void;
    unmount(): void;
    update(): void;
    getSnapshot(isPresent: boolean): void;
}
