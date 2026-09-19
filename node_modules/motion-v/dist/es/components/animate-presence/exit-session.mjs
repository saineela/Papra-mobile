import { frame } from "framer-motion/dom";
var popId = 0;
function createExitSession(config) {
	const sessions = /* @__PURE__ */ new Map();
	function addPopStyle(session) {
		if (config.props.mode !== "popLayout") return;
		const element = session.el;
		const parent = element.offsetParent;
		const parentWidth = parent instanceof HTMLElement ? parent.offsetWidth || 0 : 0;
		const size = {
			height: element.offsetHeight || 0,
			width: element.offsetWidth || 0,
			top: element.offsetTop,
			left: element.offsetLeft,
			right: 0
		};
		size.right = parentWidth - size.width - size.left;
		const x = config.props.anchorX === "left" ? `left: ${size.left}px` : `right: ${size.right}px`;
		const elementPopId = `pop-${popId++}`;
		element.dataset.motionPopId = elementPopId;
		const style = document.createElement("style");
		const nonce = config.getNonce();
		if (nonce) style.nonce = nonce;
		session.popStyle = style;
		document.head.appendChild(style);
		if (style.sheet) style.sheet.insertRule(`
    [data-motion-pop-id="${elementPopId}"] {
      position: absolute !important;
      width: ${size.width}px !important;
      height: ${size.height}px !important;
      top: ${size.top}px !important;
      ${x} !important;
      }
      `);
	}
	function removePopStyle(session) {
		const style = session.popStyle;
		if (!style) return;
		session.popStyle = void 0;
		frame.render(() => {
			document.head.removeChild(style);
		});
	}
	function track(el, states, done) {
		const session = {
			el,
			states,
			done,
			aborted: false
		};
		sessions.set(el, session);
		addPopStyle(session);
		const completions = states.map((state) => state.getFeature("exit")?.exit() ?? Promise.resolve());
		Promise.all(completions).then(() => {
			if (!session.aborted) finalize(session);
		});
	}
	function abort(el) {
		const session = sessions.get(el);
		if (!session) return;
		session.aborted = true;
		sessions.delete(el);
		removePopStyle(session);
	}
	function finalize(session) {
		sessions.delete(session.el);
		removePopStyle(session);
		session.states.forEach((state) => {
			state.getSnapshot(false);
		});
		session.done();
		if (!session.el.isConnected) session.states.forEach((state) => {
			state.unmount();
		});
		config.onAllComplete();
	}
	function dispose() {
		sessions.forEach((session) => {
			session.states.forEach((state) => {
				state.unmount();
			});
		});
		sessions.clear();
	}
	return {
		track,
		abort,
		dispose
	};
}
export { createExitSession };
