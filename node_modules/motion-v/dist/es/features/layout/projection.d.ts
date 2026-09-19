import { Feature } from '../feature';
import { MotionState } from '../../state';
export declare class ProjectionFeature extends Feature {
    static key: "projection";
    private projection;
    constructor(state: MotionState);
    initProjection(): void;
    setOptions(): void;
    update(): void;
    mount(): void;
}
