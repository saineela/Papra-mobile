import { Box } from 'framer-motion';
import { Point } from 'motion-utils';
import { Ref } from 'vue';
import { ReorderAxis } from './types';
export interface ReorderContextProps<T> {
    axis?: Ref<ReorderAxis>;
    registerItem?: (item: T, layout: Box) => void;
    updateOrder?: (item: T, offset: Point, velocity: Point) => void;
    groupRef?: Ref<HTMLElement | null>;
}
export declare const useReorderContext: <T extends ReorderContextProps<any> = ReorderContextProps<any>>(fallback?: T) => T extends null ? ReorderContextProps<any> : ReorderContextProps<any>, reorderContextProvider: (contextValue: ReorderContextProps<any>) => ReorderContextProps<any>;
