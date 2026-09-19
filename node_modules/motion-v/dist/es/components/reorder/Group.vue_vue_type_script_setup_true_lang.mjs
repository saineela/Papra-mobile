import { useDomRef } from "../../utils/use-dom-ref.mjs";
import { Motion } from "../motion/index.mjs";
import { reorderContextProvider } from "./context.mjs";
import { checkReorder, detectAxis } from "./utils.mjs";
import { computed, createBlock, createTextVNode, defineComponent, mergeProps, onUpdated, openBlock, ref, renderSlot, toDisplayString, unref, useAttrs, withCtx } from "vue";
import { invariant } from "hey-listen";
var Group_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	name: "ReorderGroup",
	inheritAttrs: false,
	__name: "Group",
	props: {
		axis: {},
		"onUpdate:values": {},
		values: {},
		as: { default: "ul" },
		asChild: { type: Boolean },
		whileDrag: {},
		whileHover: {},
		whilePress: {},
		whileInView: {},
		whileFocus: {},
		forwardMotionProps: { type: Boolean },
		ignoreStrict: { type: Boolean },
		custom: {},
		initial: { type: [
			String,
			Array,
			Object,
			Boolean
		] },
		animate: {},
		exit: {},
		variants: {},
		inherit: { type: Boolean },
		style: {},
		transformTemplate: {},
		transition: {},
		onAnimationComplete: {},
		onUpdate: {},
		onAnimationStart: {},
		layout: { type: [Boolean, String] },
		layoutId: {},
		layoutScroll: { type: Boolean },
		layoutRoot: { type: Boolean },
		"data-framer-portal-id": {},
		crossfade: { type: Boolean },
		layoutDependency: {},
		onBeforeLayoutMeasure: {},
		onLayoutMeasure: {},
		onLayoutAnimationStart: {},
		onLayoutAnimationComplete: {},
		globalPressTarget: { type: Boolean },
		onPressStart: {},
		onPress: {},
		onPressCancel: {},
		onHoverStart: {},
		onHoverEnd: {},
		inViewOptions: {},
		inView: {},
		onViewportEnter: {},
		onViewportLeave: {},
		drag: { type: [Boolean, String] },
		dragSnapToOrigin: { type: Boolean },
		dragDirectionLock: { type: Boolean },
		dragPropagation: { type: Boolean },
		dragConstraints: { type: [Boolean, Object] },
		dragElastic: { type: [
			Boolean,
			Number,
			Object
		] },
		dragMomentum: { type: Boolean },
		dragTransition: {},
		dragListener: { type: Boolean },
		dragControls: {},
		onDragStart: {},
		onDragEnd: {},
		onDrag: {},
		onDirectionLock: {},
		onDragTransitionEnd: {},
		onMeasureDragConstraints: {},
		onPanSessionStart: {},
		onPanStart: {},
		onPan: {},
		onPanEnd: {},
		onFocus: {},
		onBlur: {}
	},
	setup(__props) {
		const props = __props;
		const itemLayouts = /* @__PURE__ */ new Map();
		const detectedAxis = ref("y");
		let isReordering = false;
		const axis = computed(() => props.axis || detectedAxis.value);
		function warning$1() {
			invariant(Boolean(props.values), "Reorder.Group must be provided a values prop");
		}
		onUpdated(() => {
			isReordering = false;
		});
		const groupRef = useDomRef();
		reorderContextProvider({
			groupRef,
			axis,
			registerItem: (value, layout) => {
				const valuesSet = new Set(props.values);
				itemLayouts.forEach((_, itemValue) => {
					if (!valuesSet.has(itemValue)) itemLayouts.delete(itemValue);
				});
				itemLayouts.set(value, layout);
				if (!props.axis) {
					const nextAxis = detectAxis(props.values.flatMap((itemValue) => {
						const itemLayout = itemLayouts.get(itemValue);
						return itemLayout ? [itemLayout] : [];
					}));
					if (nextAxis !== detectedAxis.value) detectedAxis.value = nextAxis;
				}
			},
			updateOrder: (item, offset, velocity) => {
				if (isReordering) return;
				const order = props.values.flatMap((value) => {
					const layout = itemLayouts.get(value);
					return layout ? [{
						value,
						layout
					}] : [];
				});
				const element = groupRef.value;
				const direction = element?.ownerDocument.defaultView?.getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
				const newOrder = checkReorder(order, item, offset, velocity, axis.value, direction);
				if (order !== newOrder) {
					isReordering = true;
					const newValues = [...props.values];
					const measuredIndexes = order.map(({ value }) => props.values.indexOf(value));
					newOrder.forEach(({ value }, index) => {
						newValues[measuredIndexes[index]] = value;
					});
					props["onUpdate:values"]?.(newValues);
				}
			}
		});
		const attrs = useAttrs();
		function bindProps() {
			const { axis: axis$1, values, "onUpdate:values": onUpdateValues, ...rest } = props;
			return {
				...attrs,
				...rest,
				style: {
					overflowAnchor: "none",
					...rest.style
				}
			};
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Motion), mergeProps(bindProps(), {
				ref_key: "groupRef",
				ref: groupRef
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default"), createTextVNode(" " + toDisplayString(warning$1()), 1)]),
				_: 3
			}, 16);
		};
	}
});
export { Group_vue_vue_type_script_setup_true_lang_default as default };
