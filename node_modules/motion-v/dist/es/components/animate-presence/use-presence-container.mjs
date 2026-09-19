import { useMotionConfig } from "../motion-config/context.mjs";
import { provideAnimatePresence } from "./presence.mjs";
import { createExitSession } from "./exit-session.mjs";
import { onMounted, onUnmounted } from "vue";
function usePresenceContainer(props) {
	const motionConfig = useMotionConfig();
	const sessions = createExitSession({
		props,
		getNonce: () => motionConfig.value.nonce,
		onAllComplete: () => props.onExitComplete?.()
	});
	const registered = /* @__PURE__ */ new Set();
	let hasMounted = false;
	provideAnimatePresence({
		get initial() {
			return hasMounted ? void 0 : props.initial;
		},
		get custom() {
			return props.custom;
		},
		register: (state) => registered.add(state),
		unregister: (state) => registered.delete(state)
	});
	onMounted(() => {
		hasMounted = true;
	});
	function findMotionStates(container) {
		const states = [];
		for (const state of registered) {
			const el = state.element;
			if (el && (el === container || container.contains(el))) states.push(state);
		}
		return states;
	}
	function enter(el, done) {
		sessions.abort(el);
		findMotionStates(el).forEach((state) => {
			state.getFeature("exit")?.reenter();
		});
		done();
	}
	function exit(el, done) {
		const container = el;
		const states = findMotionStates(container);
		if (states.length === 0) {
			done();
			props.onExitComplete?.();
			return;
		}
		sessions.track(container, states, done);
	}
	onUnmounted(() => {
		sessions.dispose();
	});
	return {
		enter,
		exit
	};
}
export { usePresenceContainer };
