import type { LinkProps } from '../components/Link.vue';
import { linkKeys } from './link-keys';
export { linkKeys };
export declare function pickLinkProps(link: LinkProps & {
    [key: string]: any;
}): import("@vueuse/shared").ReactivePickReturn<LinkProps & {
    [key: string]: any;
}, string>;
export declare function isPartiallyEqual(item1: any, item2: any): boolean;
