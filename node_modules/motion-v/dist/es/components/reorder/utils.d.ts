import { ItemData, ReorderAxis } from './types';
import { Box, Point } from 'motion-utils';
export declare function checkReorder<T>(order: ItemData<T>[], value: T, offset: Point, velocity: Point, axis: ReorderAxis, direction?: 'ltr' | 'rtl'): ItemData<T>[];
export declare function detectAxis(layouts: Box[]): ReorderAxis;
export declare function useDefaultMotionValue(value: any, defaultValue?: number): import('motion-dom').MotionValue<any>;
