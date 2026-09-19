import { Feature } from '../feature';
/**
 * Owns the AnimatePresence exit protocol for a motion state: run the exit
 * animation, defer completion across the layoutId projection handoff, and
 * resolve the session's promise exactly once. The `isExiting` flag itself
 * lives on MotionState; this feature owns the sequence around it.
 *
 * The generation counter is bumped by exit() and reenter() — a completion
 * carrying a stale generation is a silent no-op, which is how mid-exit
 * reentry and re-entry-then-exit-again sequences stay consistent.
 */
export declare class ExitFeature extends Feature {
    static key: "exit";
    /**
     * Epoch token for the exit protocol, bumped by both exit() and reenter().
     * Every async callback captures the generation it was issued in and no-ops
     * when stale — this is what keeps an exit → reenter → exit-again sequence
     * consistent: without it, the first exit's late animation resolution would
     * clobber isExiting (which the second exit just set) and settle the second
     * exit's pendingExit prematurely, removing the DOM mid-animation.
     */
    private exitGeneration;
    private pendingExit?;
    /**
     * Run the full exit sequence for AnimatePresence and resolve when this
     * state's exit completes — including the layoutId projection handoff,
     * which is signalled back via completeExitFromProjection().
     */
    exit(): Promise<void>;
    /** Re-enter while an exit is in flight; the stale exit resolves silently. */
    reenter(): void;
    /** ProjectionFeature notifies here when a layoutId exit handoff completes. */
    completeExitFromProjection(): void;
    private tryCompleteExit;
    private settleExit;
    /**
     * Register with the nearest AnimatePresence for exit discovery — only
     * states carrying the exit feature are discoverable, and mount/unmount
     * pairing keeps the registry exact (KeepAlive remounts re-register).
     */
    mount(): void;
    unmount(): void;
}
