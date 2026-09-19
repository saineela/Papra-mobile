import { MotionState } from '../../state/motion-state';
export interface PresenceContext {
    initial?: boolean;
    custom?: any;
    /**
     * Registry of motion states under this AnimatePresence — fed by
     * ExitFeature at mount/unmount. inject resolves to the nearest ancestor,
     * so nested AnimatePresence instances scope correctly without DOM tagging.
     */
    register?: (state: MotionState) => void;
    unregister?: (state: MotionState) => void;
}
export declare const injectAnimatePresence: <T extends PresenceContext = PresenceContext>(fallback?: T) => T extends null ? PresenceContext : PresenceContext, provideAnimatePresence: (contextValue: PresenceContext) => PresenceContext, animatePresenceInjectionKey: import('vue').InjectionKey<PresenceContext>;
