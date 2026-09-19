import { MotionState } from '../../state';
import { AnimatePresenceProps } from './types';
export interface ExitSessionConfig {
    props: Pick<AnimatePresenceProps, 'mode' | 'anchorX'>;
    getNonce: () => string | undefined;
    onAllComplete: () => void;
}
/**
 * Bookkeeping unit for AnimatePresence exits: one session per exiting
 * container element. Owns pop-layout styling and the fan-in toward
 * `onAllComplete`. `abort` cancels a session whose element re-entered
 * mid-exit; its states' exit promises then resolve silently.
 */
export declare function createExitSession(config: ExitSessionConfig): {
    track: (el: HTMLElement, states: MotionState[], done: VoidFunction) => void;
    abort: (el: HTMLElement) => void;
    dispose: () => void;
};
