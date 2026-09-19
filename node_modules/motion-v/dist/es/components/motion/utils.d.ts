import { Component, DefineComponent, IntrinsicElementAttributes } from 'vue';
import { MotionProps } from './types';
import { FeatureBundle } from '../../features/dom-animation';
import { MotionBundle } from '../../state/motion-state';
import { ComponentProps, MotionHTMLAttributes } from '../../types';
type MotionCompProps = {
    create: {
        <T extends DefineComponent>(component: T, options?: MotionCreateOptions): DefineComponent<Omit<MotionProps<any, any>, 'as' | 'asChild'> & ComponentProps<T>>;
        (component: string, options?: MotionCreateOptions): DefineComponent<Omit<MotionProps<any, any>, 'as' | 'asChild'>>;
    };
};
export interface MotionCreateOptions extends MotionBundle {
    forwardMotionProps?: boolean;
}
/**
 * Creates a motion component from a base component or HTML tag
 * Caches string-based components for reuse
 */
export declare function createMotionComponent(component: string | DefineComponent, options?: MotionCreateOptions): Component;
type MotionNameSpace = {
    [K in keyof IntrinsicElementAttributes]: DefineComponent<Omit<MotionProps<K, any>, 'as' | 'asChild' | 'motionConfig' | 'layoutGroup'> & MotionHTMLAttributes<K>, 'create'>;
} & MotionCompProps;
export declare function createMotionComponentWithFeatures(featureBundle?: FeatureBundle): MotionNameSpace;
export {};
