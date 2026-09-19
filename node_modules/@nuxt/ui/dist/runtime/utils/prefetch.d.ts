type IdleCallbackHandle = ReturnType<typeof setTimeout> | number;
export declare function requestIdleCallback(callback: () => void): IdleCallbackHandle | undefined;
export declare function cancelIdleCallback(handle: IdleCallbackHandle | undefined): void;
export declare function observeIntersection(element: Element, callback: () => void): () => void;
export {};
